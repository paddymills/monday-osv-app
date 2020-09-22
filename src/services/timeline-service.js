
import mondayService from "./monday-service.js"

var moment = require('moment');

const DATE_FORMAT = "YYYY-MM-DD";

function getKey(obj) {
  // for items stored as key: true|false
  // i.e. vendor1Column: { vendor1ColumnName: true }

  return Object.keys(obj)[0];
}

export default class TimelineService {
  updateConfig(updateType, updateData) {
    switch (updateType) {
      case "settings":
        this.activeGroup = updateData.activeGroup;

        this.timelineColumn = getKey(updateData.timelineColumn);
        this.shipDateColumn = getKey(updateData.shipDateColumn);
        this.vendor1Column = getKey(updateData.vendor1Column);
        this.vendor2Column = getKey(updateData.vendor2Column);

        // timeline values
        this.vendor1Days = Number(updateData.vendor1Days);
        this.vendor2Days = Number(updateData.vendor2Days);
        this.extraDays = Number(updateData.extraDays);

        this.timelineDependsOn = [this.shipDateColumn, this.vendor2Column];
        this.timelineCalcColumns = [this.shipDateColumn, this.vendor2Column, this.timelineColumn];

        break;
      case "context":
        this.boardId = updateData.boardId;

        break;
      default:
        break;
    }
  }

  eventRequiresUpdate(columnId) {
    // if changed column is a timeline dependency
    if (this.timelineDependsOn.includes(columnId)) {
      return true;
    }

    // default: false
    return false;
  }

  valuesRequireUpdate(data) {
    // data should be a direct pipe of the return from mondayService.getGroupItems()

    // error getting values
    if (!data) {
      return true;
    }

    const vals = data.columnValues;

    // calculate new timeline
    const newTimeline = this.calculateTimeline(
      vals[this.shipDateColumn].text,
      vals[this.vendor2Column].text,
    );

    if (newTimeline !== JSON.parse(vals[this.timelineColumn].value)) {
      return true;
    }

    return false;
  }

  async updateAll() {
    const data = mondayService.getGroupItems(
      this.boardId, this.activeGroup, this.timelineCalcColumns
    );

    data
      .filter(x => this.valuesRequireUpdate(x))
      .forEach(x => this.updateItem(x));

    mondayService.success("Timelines updated");
  };

  async updateOne(itemId) {
    let data = {};


    this.updateItem(itemId, data);
  }

  updateItem(data) {
    const vals = data.columnValues;

    const newTimeline = this.calculateTimeline(
      vals[this.shipDateColumn].text,
      vals[this.vendor2Column].text
    );

    mondayService.changeColumnValue(
      this.boardId,
      data.id,
      this.timelineColumn,
      newTimeline
    );
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
