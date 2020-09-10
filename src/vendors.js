
import mondayService from "./monday-service.js";
import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

/*
  TODO: move all this to a service(class)
  so that cfg does not have to be pushed around
*/

export default class VendorSyncService {
  constructor() {
    this.boardId = 0;
  }

  async init(boardId) {
    this.boardId = boardId;

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
    const variables = { boardId };
    const response = await monday.api(query, { variables });
    const board = response.data.boards[0];
    let cfg = {
      workspaceId: board.workspace_id,
      mainColumns: board.columns.map(col => col.id).filter(id => id !== "status"),
      vendors: {},
      vendorBoards: {},
      syncColumns: []
    };

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
    const response = await monday.api(query);
    response.filter(board => board.workspace_id === cfg.workspaceId).forEach(board => {
      const id = Number(board.id);

      if (id !== boardId) {
        cfg.vendorBoards[board.id] = {
          name: board.name,
          columns: board.columns.map(col => col.id),
        };
      }
    });

    return cfg;
  }

  async syncAll(boardId, cfg) {
    const data = await mondayService.getGroupItems(
      boardId,
      cfg.active_group,
      getColumns(cfg)
    );

    data.forEach(element => {
      const id = Number(element.id);

      updateItem(boardId, id, element, cfg);
    });
  };

  async syncOne(boardId, itemId, itemVal, cfg) {
    const vendors = await getVendors(boardId, itemId, cfg);

    updateItem(boardId, itemId, data, cfg);
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

    const boardId = 0;
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

  async requiresUpdate(boardId, itemId, cfg) {
    const vendors = await getVendors(boardId, itemId, cfg);
    if (!vendors.some(item => item.text)) {  // all vendors null
      return false;
    }

    monday.storage.instance.getItem(itemId).then(res => {
      console.log(res);
    });
  }

  async getVendors(boardId, itemId, cfg) {
    const data = await mondayService.getColumnValues(
      boardId,
      itemId,
      [cfg.vendor1_column, cfg.vendor2_column]
    );

    // data: x[] -> { 0.id: {0}, 1.id: {1}, ... }
    return data.column_values.reduce((acc, x) => ({ ...acc, [x.id]: x }), {});
  }
}
