"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var DATE_FORMAT = "YYYY-MM-DD";

var moment = require('moment');

function getTimeline(value, vendor2, vendor1_days, vendor2_days, extra_days) {
  var date = moment(value);
  var subtract_days = vendor1_days + extra_days;

  if (vendor2) {
    subtract_days += vendor2_days;
  } // subtract() and add() mutate date
  // so format() is required to return value
  // otherwise start == end


  var start = date.subtract(subtract_days, 'days').format(DATE_FORMAT);
  var end = date.add(vendor1_days, 'days').format(DATE_FORMAT);
  return JSON.stringify({
    "from": start,
    "to": end
  });
}

var _default = {
  getTimeline: getTimeline
};
exports["default"] = _default;