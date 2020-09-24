
import mondayService from "./monday-service.js";
import mondaySdk from "monday-sdk-js";
import { columnValuesToObj, getKey } from "./utils.js"
const monday = mondaySdk();

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

  async init() {
    /*
      - get vendor boards
      - *vendor board class*
    */
  }

  eventRequiresUpdate(columnId) {
    /*
      determine an event fires an update
        - Get item from vendor boards
        - Determine if columnId is a synced column
        - *might need to adjust API since itemId will be needed*
    */

    // default: false
    return false;
  }

  valuesRequireUpdate(data) {
    // data should be a direct pipe of the return
    // from mondayService.getGroupItems()

    // error getting values
    if (!data) {
      return true;
    }

    // find items in vendor boards
    // determine if items need upate
    // determine if item needs to be added to a board
    // determine if item needs to be removed from a board

    return false;
  }

  async updateAll() {
    /*
      no validation check has been done
      need to:
        - get all main group items
        - iterate over all items:
          - filter out items that don't need updates
          - update what is left
        - await all updates to complete
    */

    const items = mondayService.getGroupItems(
      this.boardId, this.activeGroup, this.vendorColumns
    );

    const updatePromises = items
      .map(x => {
        return {
          id: x.id,
          column_values: columnValuesToObj(x.column_values),
        };
      })
      .filter(x => this.valuesRequireUpdate(x))
      .map(x => this.updateItem(x));

    await Promise.allSettled(updatePromises);

    mondayService.success("All items synced");
  }

  async updateOne(data) {
    // update synced pulses

    mondayService.success("Item synced");
  }

  async addItem(data, boardId) {
    // add item to board
    // set column values
  }

  async deleteItem(itemId) {
    // delete item from board
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
