
import mondayService from "./monday-service.js"
import mondaySdk from "monday-sdk-js"

async function syncAll(boardId, cfg) {
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

async function syncOne(boardId, itemId, itemVal, cfg) {
  const data = await mondayService.getColumnValues(
    boardId,
    itemId,
    getColumns(cfg)
  );

  data.column_values.forEach(col => {

  });

  updateItem(boardId, itemId, data, cfg);
}

async function handleVendorChange() {
  // check vendor1 and vendor 2
  // determine if job needs added or removed from vendor boards
}

async function addToVendor() {
  // add item to vendor when vendor1 or vendor2 assigned
}

async function deleteFromVendor() {
  // delete item from vendor when vendor1 or vendor2 changes
}

function updateItem(boardId, itemId, data, cfg) {
  let vals = {};
  data.column_values.forEach(col => {
    vals[col.id] = col;
  });

  const date = vals[cfg.ship_date_column].text;
  const new_timeline = calculateTimeline(
    date,
    vals[cfg.vendor2_column].text,
    cfg.vendor1_days,
    cfg.vendor2_days,
    cfg.extra_days
  );

  if (new_timeline !== JSON.parse(vals[cfg.timeline_column].value)) {
    mondayService.changeColumnValue(
      boardId,
      itemId,
      cfg.timeline_column,
      new_timeline
    );
  }
};

function getColumns(cfg) {
  let cols = [];
  Object.keys(cfg.sync_columns).forEach(key => {
    if (cfg.sync_columns[key]) {
      cols.push(key);
    }
  });

  return cols;
}

async function initVendors(boardId) {
  const monday = mondaySdk()

  // get board workspace
  const query = `query (
      $boardId: Int!
    ) {
    boards (ids: [$boardId]) {
      workspace_id
    }
  }`;
  const variables = { boardId };
  const response = await monday.api(query, { variables });
  let cfg = { workspaceId: response.data.boards[0].workspace_id, vendorBoardIds: [] }

  // get workspace boards
  const query = `query {
    boards {
      id,
      name,
      workspace_id
    }
  }`;
  const response = await monday.api(query);
  response.forEach(board => {
    const id = Number(board.id);

    if (board.workspace_id === cfg.workspaceId && id !== boardId) {
      cfg.vendorBoardIds.push({ id: board.id, name: board.name });
    }
  });

  return cfg;
}

export default {
  initVendors,
  updateOne,
  updateAll
}
