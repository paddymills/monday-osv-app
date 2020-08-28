
import mondayService from "./monday-service.js"

var moment = require('moment');

const DATE_FORMAT = "YYYY-MM-DD";

async function updateAll(boardId, cfg) {
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

async function updateOne(boardId, itemId, cfg) {
  const data = await mondayService.getColumnValues(
    boardId,
    itemId,
    getColumns(cfg)
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
    mondayService.changeColumnValue(
      boardId,
      itemId,
      cfg.timeline_column,
      new_timeline
    );
  }
};

function getColumns(cfg) {
  return [cfg.ship_date_column, cfg.vendor2_column, cfg.timeline_column];
}

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

export default {
  updateOne,
  updateAll
}
