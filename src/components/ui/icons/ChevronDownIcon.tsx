import type { SVGProps } from 'react';

const ChevronDownIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      fill='none'
      height='18'
      viewBox='0 0 24 24'
      width='18'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='m6 9 6 6 6-6'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.8'
      />
    </svg>
  );
};

export default ChevronDownIcon;
