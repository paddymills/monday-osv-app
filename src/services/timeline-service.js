
import mondayService from "./monday-service.js"

var moment = require('moment');

const DATE_FORMAT = "YYYY-MM-DD";

function getKey(obj) {
  return Object.keys(obj)[0];
}

export default class TimelineService {
  updateSettings(settings) {
    this.activeGroup = settings.activeGroup;

    this.timelineColumn = getKey(settings.timelineColumn);
    this.shipDateColumn = getKey(settings.shipDateColumn);
    this.vendor1Column = getKey(settings.vendor1Column);
    this.vendor2Column = getKey(settings.vendor2Column);

    // timeline values
    this.vendor1Days = Number(settings.vendor1Days);
    this.vendor2Days = Number(settings.vendor2Days);
    this.extraDays = Number(settings.extraDays);

    this.timelineDepends = [this.shipDateColumn, this.vendor2Column];
    this.timelineCalcColumns = [this.shipDateColumn, this.vendor2Column, this.timelineColumn];
  }

  updateContext(context) {
    this.boardId = context.boardId;
  }

  async updateAll() {
    const data = await mondayService.getGroupItems(
      this.boardId,
      this.activeGroup,
      this.timelineCalcColumns,
    );

    data.forEach(element => {
      const id = Number(element.id);

      this.updateItem(id, element);
    });

    mondayService.success("Timelines updated");
  };

  async updateOne(itemId) {
    const data = await mondayService.getColumnValues(
      this.boardId,
      itemId,
      this.timelineCalcColumns
    );

    this.updateItem(itemId, data);
  }

  updateItem(itemId, data) {
    let vals = {};
    data.column_values.forEach(col => {
      vals[col.id] = col;
    });

    const date = vals[this.shipDateColumn].text;
    const newTimeline = this.calculateTimeline(
      date,
      vals[this.vendor2Column].text,
      this.vendor1Days,
      this.vendor2Days,
      this.extraDays
    );

    if (newTimeline !== JSON.parse(vals[this.timelineColumn].value)) {
      mondayService.changeColumnValue(
        this.boardId,
        itemId,
        this.timelineColumn,
        newTimeline
      );
    }
  };

  calculateTimeline(shipDate, vendor2) {
    let date = moment(shipDate);

    let subtractDays = this.vendor1Days + this.extraDays;
    if (vendor2) {
      subtractDays += this.vendor2Days
    }

    // subtract() and add() mutate date
    // so format() is required to return value
    // otherwise start == end
    let start = date.subtract(subtractDays, 'days').format(DATE_FORMAT);
    let end = date.add(this.vendor1Days, 'days').format(DATE_FORMAT);

    return JSON.stringify({
      "from": start,
      "to": end
    });
  }
}
