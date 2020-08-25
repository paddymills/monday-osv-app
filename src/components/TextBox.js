import React from "react";
import "./TextBox.css";

class TextBox extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      settings: {},
      value: props.value,
      class: props.class,
      disabled: props.disabled,
      name: "",
    };
  }

  componentDidMount() {
    // post mount code
  }

  render() {
    return <input
      className={"TextBox " + this.state.class}
      type="text"
      value={this.state.value}
      disabled={this.state.disabled}
    />;
  }
}

export default TextBox;