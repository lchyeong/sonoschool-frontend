import type {
  AriaAttributes,
  ComponentType,
  FocusEventHandler,
  MouseEventHandler,
  ReactNode,
} from 'react';

export interface CommonHeaderLinkProps {
  to: string;
  className?: string | undefined;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLElement> | undefined;
  onFocus?: FocusEventHandler<HTMLElement> | undefined;
  onMouseEnter?: MouseEventHandler<HTMLElement> | undefined;
  'aria-expanded'?: AriaAttributes['aria-expanded'];
  'aria-haspopup'?: AriaAttributes['aria-haspopup'];
}

export type CommonHeaderLinkComponent = ComponentType<CommonHeaderLinkProps>;

export interface CommonHeaderLogoConfig {
  to: string;
  label: string;
  imageSrc?: string | undefined;
}

export interface CommonHeaderProps {
  logo: CommonHeaderLogoConfig;
  LinkComponent: CommonHeaderLinkComponent;
}
