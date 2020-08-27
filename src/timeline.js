
import mondaySdk from "monday-sdk-js";

var moment = require('moment');
const monday = mondaySdk();

const DATE_FORMAT = "YYYY-MM-DD";

async function updateAll(boardId, cfg) {
  const data = await getAll(
    boardId,
    cfg.active_group,
    [
      cfg.ship_date_column,
      cfg.vendor2_column,
      cfg.timeline_column
    ]
  );

  data.forEach(element => {
    const id = Number(element.id);

    updateItem(boardId, id, element, cfg);
  });
};

async function updateOne(boardId, itemId, cfg) {
  const data = await getOne(
    boardId,
    itemId,
    [
      cfg.ship_date_column,
      cfg.vendor2_column,
      cfg.timeline_column
    ]
  );

  updateItem(boardId, itemId, data, cfg);
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
    changeColumnValue(boardId, itemId, cfg.timeline_column, new_timeline);
  }
};

function calculateTimeline(ship_date, vendor2, vendor1_days, vendor2_days, extra_days) {
  let date = moment(ship_date);

  let subtract_days = vendor1_days + extra_days;
  if (vendor2) {
    subtract_days += vendor2_days
  }

  // subtract() and add() mutate date
  // so format() is required to return value
  // otherwise start == end
  let start = date.subtract(subtract_days, 'days').format(DATE_FORMAT);
  let end = date.add(vendor1_days, 'days').format(DATE_FORMAT);

  return JSON.stringify({
    "from": start,
    "to": end
  });
}

async function getAll(boardId, group, columns) {
  try {
    const query = `
    query (
      $boardId: Int!,
      $group: String!,
      $columns: [String!]
    ) {
      boards (ids: [$boardId]) {
        name,
        groups (ids: [$group]) {
          items {
            id,
            column_values (ids: $columns) {
              id,
              value,
              text
            }
          }
        }
      }
    }`;
    const variables = {
      boardId,
      group,
      columns
    };

    const response = await monday.api(query, { variables });

    return response.data.boards[0].groups[0].items;

  } catch (err) {
    monday.execute("notice", {
      message: "Error executing GraphQL. Check console.",
      type: "error",
      timeout: 10000,
    });

    console.log(err);
  }
}

async function getOne(boardId, itemId, columns) {
  try {
    const query = `
    query (
      $boardId: Int!,
      $itemId: Int!,
      $columns: [String!]
    ) {
      boards (ids: [$boardId]) {
        items (ids: [$itemId]) {
          column_values (ids: $columns) {
            id,
            value,
            text
          }
        }
      }
    }`;
    const variables = {
      boardId,
      itemId,
      columns
    };

    const response = await monday.api(query, { variables });

    return response.data.boards[0].items[0];

  } catch (err) {
    monday.execute("notice", {
      message: "Error executing GraphQL. Check console.",
      type: "error",
      timeout: 10000,
    });

    console.log(err);
  }
}

async function changeColumnValue(boardId, itemId, columnId, value) {
  try {
    const query = `
      mutation change_column_value($boardId: Int!, $itemId: Int!, $columnId: String!, $value: JSON!) {
        change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
          id
        }
      }`;
    const variables = {
      boardId,
      columnId,
      itemId,
      value
    };

    const response = await monday.api(query, {
      variables
    });
    return response;
  } catch (err) {
    monday.execute("notice", {
      message: "Error executing GraphQL. Check console.",
      type: "error",
      timeout: 10000,
    });

    console.log(err);
  }
}

export default {
  updateOne,
  updateAll
}
