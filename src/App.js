import React from "react";
import "./App.scss";
import TimelineService from "./services/timeline-service.js";
// import vendorService from "./services/vendor-service.js";
import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

class App extends React.Component {
  constructor(props) {
    super(props);

    // init services
    this.services = {
      timelines: new TimelineService(),
    };

    // init state
    this.state = {};
  }

  componentDidMount() {
    // TODO: remove when deployed
    console.clear();

    monday.listen(["settings", "context", "events"], res => {
      const { type, data } = res;

      switch (type) {
        case "settings":
        case "context":

          // update services
          Object.values(this.services).forEach(
            service => service.updateConfig(type, data)
          );

          // update state
          this.setState(data);

          break;

        case "new_items":
        case "change_column_values":
          /*
            data:
              - boardId: int
              - columnId: str
              - columnType: str
              - ColumnValue: JSON
              - itemIds: Array[int]
          */

          Object.values(this.services)
            .filter(svc => svc.eventRequiresUpdate(data.columnId))
            .forEach(svc => data.itemIds.forEach(
              x => svc.updateOne(x)
            ));

          break;

        default:
          const date = new Date().toISOString();
          console.log("[" + date + "] Unhandled event received\n", res);
          break;
      }
    });
  }

  render() {
    return <div className={"App " + this.state.viewMode}>
      <h1 className="split-hidden"><u>Outside Vendor Services</u></h1>
      <button onClick={() => this.services.timelines.updateAll()}>Update Timelines</button>
      {/* <button onClick={() => this.services.vendors.syncAll()}>Sync Vendors</button> */}
    </div>;
  }
}

export default App;