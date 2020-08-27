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
      this.handleSettings(res);
    });
    monday.listen("context", res => {
      this.handleContext(res);
    });
    monday.listen("events", res => {
      this.handleEvent(res);
    });
  }

  handleSettings(res) {
    this.log("Settings updated", res.data);

    // flatten settings
    // some values match pattern [key]: { "[value]": true }
    // [key]: { "[value]": true } -> [key]: "[value]"
    Object.keys(res.data).forEach(key => {
      let value = res.data[key]

      if (value instanceof Object) {            // value is an Object
        let val_keys = Object.keys(value);

        if (val_keys.length === 1) {            // value has only 1 key
          if (value[val_keys[0]] === true) {    // value's value is true (needed to single out sync_columns)
            res.data[key] = val_keys[0];
          }
        }
      }
    });

    // set timelines dependent columns
    res.data.timeline_depends_on = [
      res.data.ship_date_column,
      res.data.vendor2_column,
    ]

    // convert numeric values
    res.data.vendor1_days = Number(res.data.vendor1_days)
    res.data.vendor2_days = Number(res.data.vendor2_days)
    res.data.extra_days = Number(res.data.extra_days)

    this.setState({
      settings: res.data,
    });
  }

  handleContext(res) {
    this.log("Context updated", res.data);

    this.setState({
      context: res.data,
    });
  }

  handleEvent(res) {
    this.log("Event fired", res.data);

    if (this.state.settings.timeline_depends_on.includes(res.data.columnId)) {
      timelines.updateOne(this.state.context.boardId, res.data.itemIds[0], this.state.settings);
    }
  }

  log(subject, data) {
    const date = new Date().toISOString();

    console.log("[" + date + "] " + subject, data);
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
      <h1 className="split-hidden"><u>Outside Vendor Services</u></h1>
      <button onClick={() => this.clickUpdateTimelines()}>Update Timelines</button>
      <button onClick={() => this.clickSyncVendors()}>Sync Vendors</button>
      <button className="split-hidden" onClick={() => this.clickAll()}>Run All</button>
    </div>;
  }
}

export default App;