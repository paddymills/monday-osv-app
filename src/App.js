import React from "react";
import "./App.scss";
import { updateTimelines, updateTimeline } from "./timeline.js";
import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

class App extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      settings: {},
      context: {},
      last_change: {},
      status: "",
    };

    this.timeline_depends_on = [];
  }

  componentDidMount() {
    monday.listen("settings", res => {
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

      // set timeline dependent columns
      this.timeline_depends_on = [
        res.data.ship_date_column,
        res.data.vendor2_column,
      ]

      // convert numeric values
      res.data.vendor1_days = Number(res.data.vendor1_days)
      res.data.vendor2_days = Number(res.data.vendor2_days)
      res.data.extra_days = Number(res.data.extra_days)

      this.setState({
        settings: res.data,
        status: "settings updated",
      })
    });
    monday.listen("context", res => {
      this.setState({
        context: res.data,
        status: "context updated",
      })
    });
    monday.listen("events", res => {
      this.setState({
        last_change: res.data,
        status: "context updated: " + res.data.columnId,
      })

      this.handleUpdate(res);
    });
  }

  clickAll() {
    this.clickUpdateTimelines();
    this.clickSyncVendors();

    this.setState({ status: "all clicked" });
  }

  clickUpdateTimelines() {
    updateTimelines(this.state.context.boardId, this.state.settings)

    this.setState({ status: "timeline clicked" });
  }

  clickSyncVendors() {
    this.setState({ status: "sync clicked" });
  }

  handleUpdate(res) {
    if (this.timeline_depends_on.includes(res.data.columnId)) {
      updateTimeline(this.state.context.boardId, res.data.itemIds[0], this.state.settings)
    }
  }

  render() {
    return <div className="App" >
      <h1><u>Outside Vendor Services</u></h1>
      <button onClick={() => this.clickUpdateTimelines()}>Update Timelines</button>
      <button onClick={() => this.clickSyncVendors()}>Sync Vendors</button>
      <button onClick={() => this.clickAll()}>Run All</button>
      <p>Status: {this.state.status}</p>
      <p>{JSON.stringify(this.state.last_change, null, 2)}</p>
      <p>{JSON.stringify(this.timeline_depends_on, null, 2)}</p>
      <p>{JSON.stringify(this.state.settings, null, 2)}</p>
      <p>Board ID: {this.state.context.boardId}</p>
    </div>;
  }
}

export default App;