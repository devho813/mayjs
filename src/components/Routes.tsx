import React from "react";
import { Switch, Route } from "react-router-dom";
import FirstWebgl from "./FirstWebgl";

export default () => (
  <Switch>
    <Route exact path="/" component={FirstWebgl} />
  </Switch>
);
