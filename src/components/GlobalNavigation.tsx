import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

function GlobalNavigation() {
  return (
    <NavWrapper>
      <NavList>
        <NavItem><Link to="/">MAY.JS 게임</Link></NavItem>
        <NavItem><Link to="/mayjs-character">MAY.JS 캐릭터</Link></NavItem>
        <NavItem><Link to="/mayjs-character2">MAY.JS 캐릭터2</Link></NavItem>
      </NavList>
    </NavWrapper>
  );
}

const NavWrapper = styled.div`
  position: fixed;
  width: 50vw;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
`;

const NavList = styled.ul`
  width: 100%;
  background-color: rgba(125, 125, 125, 0.8);
  border-radius: 0 0 30px 30px;
  text-align: center;
`;

const NavItem = styled.li`
  display: inline-block;
  margin: 15px 40px;

  & > a {
    color: white;
    font-size: 20px;
    text-decoration: none;

    @media (max-width: 1220px){
      font-size: 16px;
    }
  }

  @media (max-width: 1070px){
    margin: 20px;
  }
`;

export default GlobalNavigation;
