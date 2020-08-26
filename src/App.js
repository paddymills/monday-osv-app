import React from "react";
import "./App.scss";
import updateTimelines from "./timeline.js";
import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

class App extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      name: "monday apps",
      settings: {},
      context: {},
      status: "",
    };
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

  render() {
    return <div className="App" >
      <h1> Hello, {this.state.name}!</h1>
      <button onClick={() => this.clickUpdateTimelines()}>Update Timelines</button>
      <button onClick={() => this.clickSyncVendors()}>Sync Vendors</button>
      <button onClick={() => this.clickAll()}>Run All</button>
      <p>Status: {this.state.status}</p>
      <p>{JSON.stringify(this.state.settings, null, 2)}</p>
      <p>Board ID: {this.state.context.boardId}</p>
    </div>;
  }
}

export default App;