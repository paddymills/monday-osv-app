import React from "react";
import "./App.scss";
import timelines from "./timelines.js";
import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

class App extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      settings: {},
      context: {},
    };

    this.timeline_depends_on = [];
  }

  componentDidMount() {
    monday.listen("settings", res => {
      this.setState({
        settings: this.processSettings(res.data),
      });

      this.log("Settings updated", res.data);
    });
    monday.listen("context", res => {
      this.setState({
        context: res.data,
      });

      this.log("Context updated", res.data);
    });
    monday.listen("events", res => {
      this.handleUpdate(res);

      this.log("Event fired", res.data);
    });
  }

  handleUpdate(res) {
    if (this.timeline_depends_on.includes(res.data.columnId)) {
      timelines.updateOne(this.state.context.boardId, res.data.itemIds[0], this.state.settings);
    }
  }

  log(subject, data) {
    const date = new Date().toISOString();

    console.log("[" + date + "] " + subject, data);
  }

  processSettings(data) {
    // flatten settings
    // some values match pattern [key]: { "[value]": true }
    // [key]: { "[value]": true } -> [key]: "[value]"
    Object.keys(data).forEach(key => {
      let value = data[key]

      if (value instanceof Object) {            // value is an Object
        let val_keys = Object.keys(value);

        if (val_keys.length === 1) {            // value has only 1 key
          if (value[val_keys[0]] === true) {    // value's value is true (needed to single out sync_columns)
            data[key] = val_keys[0];
          }
        }
      }
    });

    // set timelines dependent columns
    this.timeline_depends_on = [
      data.ship_date_column,
      data.vendor2_column,
    ]

    // convert numeric values
    data.vendor1_days = Number(data.vendor1_days)
    data.vendor2_days = Number(data.vendor2_days)
    data.extra_days = Number(data.extra_days)

    if (data.vendor1_days)

      return data;
  }

  clickAll() {
    this.clickUpdateTimelines();
    this.clickSyncVendors();

    monday.execute("notice", {
      message: "Timelines updated & Vendor boards synced",
      type: "success",
    });
  }

  clickUpdateTimelines() {
    timelines.updateAll(this.state.context.boardId, this.state.settings);

    monday.execute("notice", {
      message: "Timelines updated",
      type: "success",
    });
  }

  clickSyncVendors() {
    monday.execute("notice", {
      message: "Vendor boards synced",
      type: "success",
    });
  }

  render() {
    return <div className={"App " + this.state.context.viewMode}>
      <h1><u>Outside Vendor Services</u></h1>
      <button id="update" onClick={() => this.clickUpdateTimelines()}>Update Timelines</button>
      <button id="sync" onClick={() => this.clickSyncVendors()}>Sync Vendors</button>
      <button id="all" onClick={() => this.clickAll()}>Run All</button>
    </div>;
  }
}

export default App;