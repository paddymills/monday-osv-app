import React from "react";
import "./App.scss";
import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

class App extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      settings: {},
      context: {},
      name: "monday apps",
    };
  }

  componentDidMount() {
    monday.listen("settings", res => {
      this.setState({
        settings: res.data
      })
    });
    monday.listen("context", res => {
      this.setState({
        context: res.data
      })
    });
  }

  render() {
    return <div className="App" >
      <h1> Hello, {this.state.name}!</h1>
      <button>All</button>
      <button>Update Timelines</button>
      <button>Sync Vendors</button>
      <p> First Vendor Days: {this.state.settings.vendor1_days} </p>
      <p> Second Vendor Days: {this.state.settings.vendor2_days} </p>
      <p> Extra Days: {this.state.settings.extra_days} </p>
      <p> {JSON.stringify(this.state.settings, null, 2)} </p>
      <p> {JSON.stringify(this.state.context, null, 2)} </p>
    </div>;
  }
}

export default App;