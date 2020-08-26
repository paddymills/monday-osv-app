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
      status: "",
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

  clickAll() {
    this.setState({ status: "all clicked" });
  }

  clickUpdate() {
    this.setState({ status: "timeline clicked" });
  }

  clickSync() {
    this.setState({ status: "sync clicked" });
  }

  render() {
    return <div className="App" >
      <h1> Hello, {this.state.name}!</h1>
      <button onClick={() => this.clickAll()}>Run All</button>
      <button onClick={() => this.clickUpdate()}>Update Timelines</button>
      <button onClick={() => this.clickSync()}>Sync Vendors</button>
      <p>Status: {this.state.status}</p>
    </div>;
  }
}

export default App;