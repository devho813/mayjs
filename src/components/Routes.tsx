import React from "react";
import { Switch, Route } from "react-router-dom";
import MayjsCharacter from "./MayjsCharacter";
import MayjsCharacter2 from "./MayjsCharacter2";

export default () => (
  <Switch>
    <Route exact path="/" component={MayjsCharacter} />
    <Route exact path="/mayjs-character2" component={MayjsCharacter2} />
  </Switch>
);
