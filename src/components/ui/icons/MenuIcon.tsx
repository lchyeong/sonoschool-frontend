import type { SVGProps } from 'react';

const MenuIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      fill='none'
      height='20'
      viewBox='0 0 24 24'
      width='20'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='M4 7h16' stroke='currentColor' strokeLinecap='round' strokeWidth='1.8' />
      <path d='M4 12h16' stroke='currentColor' strokeLinecap='round' strokeWidth='1.8' />
      <path d='M4 17h16' stroke='currentColor' strokeLinecap='round' strokeWidth='1.8' />
    </svg>
  );
};

export default MenuIcon;
