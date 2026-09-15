import React from 'react'
import { Outlet } from "react-router-dom";

import NavbarSidebar from '../shared/Navbar';
import Footer from '../shared/Footer';
const Layout = () => {
  return (
   <>
      <NavbarSidebar />


      <Outlet />

      <Footer />
   </>
  )
}

export default Layout