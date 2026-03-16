import type { SVGProps } from 'react';

const CloseIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      fill='none'
      height='20'
      viewBox='0 0 24 24'
      width='20'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='m6 6 12 12' stroke='currentColor' strokeLinecap='round' strokeWidth='1.8' />
      <path d='m18 6-12 12' stroke='currentColor' strokeLinecap='round' strokeWidth='1.8' />
    </svg>
  );
};

export default CloseIcon;
