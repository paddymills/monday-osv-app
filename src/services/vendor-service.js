
import mondayService from "./monday-service.js";
import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

function getKey(obj) {
  return Object.keys(obj)[0];
}

export default class VendorSyncService {
  constructor() {
    this.initStatus = {
      settings: false,
      context: false,
    };
  }

  updateSettings(settings) {
    this.activeGroup = settings.activeGroup;
    this.vendor1Column = getKey(settings.vendor1Column);
    this.vendor2Column = getKey(settings.vendor2Column);

    this.vendorColumns = [this.vendor1Column, this.vendor2Column];

    this.initStatus.settings = true;

    // run init() if everything is initialized
    if (this.initStatus.settings && this.initStatus.context) {
      this.init();
    }
  }

  updateContext(context) {
    this.boardId = context.boardId;

    this.initStatus.context = true;

    // run init() if everything is initialized
    if (this.initStatus.settings && this.initStatus.context) {
      this.init();
    }
  }

  async init() {

    /*
      This initializes the configuration of all the
      outside vendor boards, creating a map of boards
      and columns. This information is used when an
      happens to understand if data needs to be synced.

      1) Query using this board's ID to get
        - workspace ID
        - this board's column IDs
      2) Query boards and filter using workspace ID
        - vendor board IDs
        - vendor board column IDs

      Data will be synced from the main (this) board to the
      vendor boards by finding if the vendor boards that
      apply (vendor 1 and vendor 2 status') have columns
      with IDs the same as the column that changed.
    */

    // get board workspace
    let query = `query (
          $boardId: Int!
        ) {
        boards (ids: [$boardId]) {
          workspace_id,
          columns {
            id
          }
        }
      }`;
    const variables = { boardId: this.boardId };
    let response = await monday.api(query, { variables });
    const board = response.data.boards[0];

    this.workspaceId = board.workspace_id;
    this.mainColumns = board.columns
      .map(col => col.id)
      .filter(id => id !== "status");

    this.vendorBoards = {};

    // get workspace boards
    query = `query {
        boards {
          id,
          name,
          workspace_id,
          columns {
            id
          }
        }
      }`;
    response = await monday.api(query);
    response.data.boards
      .filter(board => board.workspace_id === this.workspaceId)
      .forEach(board => {
        const id = Number(board.id);

        if (id !== this.boardId) {
          this.vendorBoards[id] = {
            // TODO: remove name.replace when go-live
            name: board.name.replace("dev :: ", ""),
            columns: board.columns.map(col => col.id),
          };
        }
      }
      );

    // TODO: remove before deploy
    const data = await mondayService.getGroupItems(
      this.boardId,
      this.activeGroup,
      this.vendorColumns
    );

    data.forEach(element => {
      monday.storage.instance.deleteItem(element.id);
    });
  }

  get vendors() {
    // data: {} -> { 0: 0.name, 1: 1.name, ... }
    return Object.keys(this.vendorBoards).reduce((acc, x) => ({ ...acc, [x]: this.vendorBoards[x].name }), {});
  }

  getVendorIdByName(vendor) {
    for (const [id, name] of Object.entries(this.vendors)) {
      if (name == vendor) {
        return Number(id);
      }
    }

    return;
  }

  async syncAll() {
    const data = await mondayService.getGroupItems(
      this.boardId,
      this.activeGroup,
      this.vendorColumns
    );

    data.forEach(element => {
      let promises = Array();
      const id = Number(element.id);

      this.mainColumns.forEach(col => {
        // TODO: only update if needed
        promises.push(this.updateItem(id, col));
      });
    });

    // TODO: sync vendor statuses back to main board

    Promise.allSettled(promises);
    mondayService.success("Vendor boards synced");
  }

  async syncOne(itemId, columnId) {
    if (this.vendorColumns.includes(columnId)) {
      this.handleVendorChange(itemId);
    } else {
      this.updateItem(itemId, columnId);
    }
  }

  async updateItem(itemId, columnId) {
    // get vendors from storage
    const vendorsFromStorage = await this.getVendorsFromStorage(itemId);

    if (vendorsFromStorage === null) {
      this.handleVendorChange(itemId);
      return; // handleVendorChange will sync boards
    }

    // Get vendor column values
    const vendorColumnValues = await this.getItemVendors(itemId);

    // vendor 1
    this.syncVendor(
      itemId,
      columnId,
      vendorColumnValues[this.vendor1Column],
      vendorsFromStorage.vendor1,
    );

    // vendor 2
    this.syncVendor(
      itemId,
      columnId,
      vendorColumnValues[this.vendor2Column],
      vendorsFromStorage.vendor2,
    );
  }

  async syncColumn(fromBoardId, fromItemId, toBoardId, toItemId, columnId) {
    const value = await mondayService
      .getColumnValues(fromBoardId, fromItemId, [columnId])
      .then(res => {
        return res.column_values[0].value
      });

    mondayService.changeColumnValue(toBoardId, toItemId, columnId, value);
  }

  async syncVendor(itemId, columnId, vendorColumn, vendorStorage) {
    const toBoard = this.getVendorIdByName(vendorColumn.text);

    if (vendorStorage.name !== vendorColumn.text) {
      this.handleVendorChange(itemId);
    } else if (vendorColumn) {
      this.syncColumn(
        this.boardId,
        itemId,
        toBoard,
        vendorStorage.id,
        columnId
      );
    } else if (vendorStorage.id) {
      // remove from synced board
      this.deleteFromVendor(vendorStorage.id);
    }
  }

  async handleVendorChange(itemId) {
    // check vendor1 and vendor 2
    // determine if job needs added or removed from vendor boards

    // get vendor values from storage (previous synced state)
    let storage = await this.getVendorsFromStorage(itemId)
      .then(res => {
        // if not in storage, init storage object
        if (res === null) {
          return {
            vendor1: {
              name: null,
              id: null,
            },
            vendor2: {
              name: null,
              id: null,
            }
          }
        }

        return res;
      });

    // get current vendor values
    const columns = await this.getItemVendors(itemId);

    const vendorPairs = [
      [this.vendor1Column, "vendor1"],
      [this.vendor2Column, "vendor2"],
    ];

    for (const [c, p] of vendorPairs) {
      if (!columns[c].text) {
        if (storage[p].id) {
          // remove from synced board
          this.deleteFromVendor(Number(storage[p].id));
        }
      } else if (columns[c].text !== storage[p].name) {
        if (storage[p].id) {
          // delete from vendor
          this.deleteFromVendor(Number(storage[p].id));
        }

        // add to vendor
        const newItemId = await this.addToVendor(itemId, columns[c].text);

        if (newItemId) {
          // update storage object
          storage[p] = {
            name: columns[c].text,
            id: newItemId,
          };
        }
      }
    }

    // write storage object back to storage
    this.setVendorStorage(itemId, storage);
  }

  async addToVendor(itemId, vendorName) {
    const vendorBoardId = this.getVendorIdByName(vendorName);
    if (!vendorBoardId) {
      mondayService.error("Vendor \"" + vendorName + "\" does not have a board");
      return null;
    }

    const itemName = await mondayService.getItemName(itemId);

    const columns = this.vendorBoards[vendorBoardId].columns
      .filter(x => this.mainColumns.includes(x));

    const values = await mondayService
      .getColumnValues(this.boardId, itemId, columns)
      .then(res => {
        return res.column_values
          .filter(x => x.value)
          .reduce((acc, x) => ({ ...acc, [x.id]: JSON.parse(x.value) }), {})
      })
      .then(res => JSON.stringify(res));

    // add item to vendor when vendor1 or vendor2 assigned
    const query = `mutation (
        $vendorBoardId: Int!,
        $itemName: String,
        $values: JSON
      ) {
        create_item (
          board_id: $vendorBoardId,
          item_name: $itemName,
          column_values: $values
        ) {
          id
        }
      }`;
    const variables = { vendorBoardId, itemName, values };

    return await monday.api(query, { variables })
      .then(res => {
        console.log("AddToVendor::Mutation Success:", res);
        return res.data.create_item.id;
      })
      .catch(err => {
        console.log("AddToVendor::Mutation Error:", err);
        return null;
      });
  }

  async deleteFromVendor(itemId) {
    // delete item from vendor when vendor1 or vendor2 changes
    const query = `mutation ( $itemId: Int ) {
        delete_item (item_id: $itemId) {
          id
        }
      }`;
    const variables = { itemId };
    monday.api(query, { variables });
  }

  async requiresUpdate(itemId, columnId) {
    // always sync if vendorColumn changes
    if (this.vendorColumns.includes(columnId)) {
      return true;
    }

    // get current vendor values
    const currentVendorsValues = await this.getItemVendors(itemId)
      .then(res => {
        return [
          res[this.vendor1Column].text,
          res[this.vendor2Column].text,
        ];
      });

    // get vendor values from storage (previous synced state)
    const vendorsFromStorage = await this.getVendorsFromStorage(itemId)
      .then(res => {
        if (res === null) {
          return true;
        } else {
          return [
            res.vendor1.name,
            res.vendor2.name,
          ];
        }
      });

    // if not in storage, vendorsFromStorage == null
    if (vendorsFromStorage) {
      if (vendorsFromStorage !== currentVendorsValues) {
        return true;
      }
    }

    // test if vendor boards have column with the same columnId
    currentVendorsValues.forEach(vendor => {
      const vendorBoardId = this.getVendorIdByName(vendor);

      if (this.vendorBoards[vendorBoardId].columns.includes(columnId)) {
        return true;
      }
    });

    return false;
  }

  async getItemVendors(itemId) {
    const data = await mondayService.getColumnValues(
      this.boardId,
      itemId,
      this.vendorColumns
    );

    // data: x[] -> { 0.id: {0}, 1.id: {1}, ... }
    return data.column_values.reduce((acc, x) => ({ ...acc, [x.id]: x }), {});
  }

  async getVendorsFromStorage(itemId) {
    return await monday.storage.instance
      .getItem(itemId)
      .then(res => {
        if (res.data.value === "[object Object]") {
          return null;
        }

        return JSON.parse(res.data.value);
      });
  }

  async setVendorStorage(key, value) {
    return await monday.storage.instance.setItem(key, JSON.stringify(value));
  }
}
