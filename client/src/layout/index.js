import React from 'react'
import logo from '../assets/logo.jpg'

const AuthLayouts = ({children}) => {
  return (
    <>
        <header className='flex justify-center items-center py-3 shadow-md bg-pink-500'>
            <img 
              src={logo}
              alt='logo'
              width={70}
              height={70}
              style={{ borderRadius: '20px' }}
            />
        </header>

        {children}
    </>
  )
}

export default AuthLayouts
