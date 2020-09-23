
import mondayService from "./monday-service.js"
import { columnValuesToObj, getKey } from "./utils.js"

var moment = require('moment');

const DATE_FORMAT = "YYYY-MM-DD";

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

    // calculate new timeline
    const newTimeline = this.calculateTimeline(
      data.column_values[this.shipDateColumn].text,
      data.column_values[this.vendor2Column].text,
    );

    // test that new timeline is different from current
    // only look at 'from' and 'to', db might store other values in JSON
    const parsedCurrentTimeline = JSON.parse(data.column_values[this.timelineColumn].value);
    const currentTimeline = { "from": parsedCurrentTimeline.from, "to": parsedCurrentTimeline.to };
    if (newTimeline.from !== currentTimeline) {
      return true;
    }

    return false;
  }

  async updateAll() {
    const data = mondayService.getGroupItems(
      this.boardId, this.activeGroup, this.timelineCalcColumns
    );

    const res = data
      .map(x => {
        return {
          id: x.id,
          column_values: columnValuesToObj(x.column_values),
        };
      })
      .filter(x => this.valuesRequireUpdate(x))
      .forEach(x => this.updateItem(x));

    await Promise.all(res);

    mondayService.success("Timelines updated");
  };

  async updateOne(itemId) {
    let data = {};


    this.updateItem(itemId, data);
  }

  async updateItem(data) {
    const vals = data.column_values;

    const newTimeline = this.calculateTimeline(
      vals[this.shipDateColumn].text,
      vals[this.vendor2Column].text
    );

    return mondayService.changeColumnValue(
      this.boardId,
      data.id,
      this.timelineColumn,
      JSON.stringify(newTimeline)
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

    return { "from": start, "to": end };
  }
}
