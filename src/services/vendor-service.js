
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

  updateConfig(updateType, updateData) {
    switch (updateType) {
      case "settings":
        this.activeGroup = settings.activeGroup;
        this.vendor1Column = getKey(settings.vendor1Column);
        this.vendor2Column = getKey(settings.vendor2Column);

        this.vendorColumns = [this.vendor1Column, this.vendor2Column];

        this.initStatus.settings = true;

        break;
      case "context":
        this.boardId = context.boardId;

        this.initStatus.context = true;

        break;
      default:
        break;
    }

    // run init() if everything is initialized
    if (this.initStatus.settings && this.initStatus.context) {
      this.init();
    }
  }

  eventRequiresUpdate(columnId) {
    // determine an event fires an update

    // default: false
    return false;
  }

  valuesRequireUpdate(data) {
    // data should be a direct pipe of the return
    // from mondayService.getGroupItems()

    return false;
  }

  async updateAll() {


    mondayService.success("All items synced");
  }

  async updateOne(data) {


    mondayService.success("Item synced");
  }

  async addItem(data) {

  }

  async updateItem(data) {


    return mondayService.changeColumnValue(
      this.boardId,
      data.id,
      this.timelineColumn,
      JSON.stringify(newTimeline)
    );
  }
}
