import React from "react";
import "./App.scss";
import timelineService from "./services/timeline-service.js";
import vendorService from "./services/vendor-service.js";
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

    // init services
    this.services = {
      vendors: new vendorService(),
      timelines: new timelineService(),
    };
  }

  componentDidMount() {
    monday.listen(["settings", "context", "events"], res => {
      const { type, data } = res;

      switch (type) {
        case "settings":
          this.log("Settings update:", data);

          // update services
          Object.values(this.services).forEach(
            service => service.updateSettings(data)
          );

          // store in state
          this.setState({ settings: data });

          break;
        case "context":
          this.log("Context update:", data);

          // update services
          Object.values(this.services).forEach(
            service => service.updateContext(data)
          );

          // store in state
          this.setState({ context: data });

          break;
        case "events":
          this.log("Event:", data);
          this.handleEvent(res);
          break;
        default:
          this.log("Unhandled event received", res)
          break;
      }
    });
  }

  handleEvent(res) {
    const { data } = res;
    let logEvent = false;

    data.itemIds.forEach(itemId => {

      if (this.state.settings.timelineDependsOn.includes(data.columnId)) {
        this.services.timelines.updateOne(itemId);

        logEvent = true;
      }

      if (this.services.vendors.requiresUpdate(data.columnId)) {
        // console.log(data);

        logEvent = true;
      }

    });

    if (logEvent) {
      this.log("Event fired", res);
    }
  }

  log(subject, data) {
    const date = new Date().toISOString();

    console.log("[" + date + "] " + subject + "\n", data);
  }

  clickAll() {
    Object.values(this.services).forEach(
      service => service.updateAll()
    );

    monday.execute("notice", {
      message: "Timelines updated & Vendor boards synced",
      type: "success",
    });
  }

  render() {
    return <div className={"App " + this.state.context.viewMode}>
      <h1 className="split-hidden"><u>Outside Vendor Services</u></h1>
      <button onClick={() => this.services.timelines.updateAll()}>Update Timelines</button>
      <button onClick={() => this.services.vendors.updateAll()}>Sync Vendors</button>
      <button className="split-hidden" onClick={() => this.clickAll()}>Run All</button>
    </div>;
  }
}

export default App;