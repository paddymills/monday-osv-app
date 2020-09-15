
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
            name: board.name,
            columns: board.columns.map(col => col.id),
          };
        }
      }
      );

    // console.log("vendors:", this.vendors);
  }

  get vendors() {
    // data: {} -> { 0: 0.name, 1: 1.name, ... }
    return Object.keys(this.vendorBoards).reduce((acc, x) => ({ ...acc, [x]: this.vendorBoards[x].name }), {});
  }

  getVendorIdByName(vendor) {
    Object.keys(this.vendorBoards).forEach(id => {
      if (this.vendorBoards[id].name === vendor) {
        return id;
      }
    });

    return;
  }

  syncColumns(vendor) {
    if (typeof vendor === "string") {
      vendor = this.getVendorIdByName(vendor);
    }

    if (!vendor) {
      return;
    }

    return this.vendorBoards[vendor].columns.filter(col => this.mainColumns.includes(col));
  }

  async syncAll() {
    const data = await mondayService.getGroupItems(
      this.boardId,
      this.activeGroup,
      this.vendorColumns
    );

    data.forEach(element => {
      const id = Number(element.id);

      // this.updateItem(id, element);
    });

    mondayService.success("Vendor boards synced");
  };

  async syncOne(itemId, itemVal) {
    const vendors = await this.getVendors(itemId);

    this.updateItem(itemId, vendors);
  }

  async handleVendorChange() {
    // check vendor1 and vendor 2
    // determine if job needs added or removed from vendor boards
  }

  async addToVendor(itemName, vendorName) {
    /*
      TODO: change function to accept itemId (from main board)
      and have it find the vendor board ID and values to move
    */

    const boardId = this.boardId
    const values = JSON.stringify({});

    // add item to vendor when vendor1 or vendor2 assigned
    const query = `mutation (
        $boardId: Int,
        $itemName: String,
        $values: JSON
      ) {
        create_item (
          board_id: $boardId,
          item_name: $itemName,
          column_values: $values
        ) {
          id
        }
      }`;
    const variables = { boardId, itemName, values };
    const res = await monday.api(query, { variables });
    console.log(res);
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

  async syncColumn(fromBoardId, fromItemId, toBoardId, toItemId, columnId) {
    const response = await mondayService.getColumnValues(fromBoardId, fromItemId, [columnId]);
    const value = response.data.boards[0].items[0].column_values[0].value;
    mondayService.changeColumnValue(toBoardId, toItemId, columnId, value);
  }

  updateItem(boardId, itemId, columnId) {
    // Get vendor column values
    // 


  };

  async requiresUpdate(itemId, columnId) {

    // get current vendor values
    const currentVendorsValues = this.getItemVendors(itemId).then(res => {
      return Object.values(res).map(item => item.text);
    });

    // get vendor values from storage
    const vendorsFromStorage = monday.storage.instance
      .getItem(itemId)
      .then(res => {
        return res.data.value;
      });

    if (vendorsFromStorage && vendorsFromStorage.some(x => x)) {
      if (vendorsFromStorage !== currentVendorsValues) {
        return true;
      }
    }

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
}
