import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

function GlobalNavigation() {
  return (
    <NavWrapper>
      <NavList>
        <NavItem><Link to="/">MAY.JS 캐릭터</Link></NavItem>
        <NavItem><Link to="/mayjs-character2">MAY.JS 캐릭터2</Link></NavItem>
        <NavItem><Link to="/mayjs-game">MAY.JS 게임</Link></NavItem>
      </NavList>
    </NavWrapper>
  );
}

const NavItem = styled.li`
  display: inline-block;
  margin: 20px 40px;

  & > a {
    color: white;
    font-size: 20px;
    text-decoration: none;

    @media (max-width: 1200px){
      font-size: 16px;
    }
  }

  @media (max-width: 1050px){
    margin: 20px;
  }
`;

const NavList = styled.ul`
  width: 100%;
  background-color: rgba(125, 125, 125, 0.8);
  border-radius: 0 0 30px 30px;
  text-align: center;
  transition: transform .8s;
  transform: translateY(-70%);
`;

const NavWrapper = styled.div`
  position: fixed;
  width: 50vw;
  top: 0;
  left: 50%;
  transform: translateX(-50%);

  &:hover{
    ${NavList}{
      transform: translateY(0);
    }
  }
`;

export default GlobalNavigation;
