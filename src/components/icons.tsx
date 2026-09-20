import type { SVGProps } from "react";

/* One consistent stroke-icon system for the whole board — round caps, 2px
   stroke, currentColor — standing in for every glyph that used to be an
   emoji. Each icon is a 24x24 viewBox so they drop in at any font-size. */

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 12.5l5 5L20 6" />
    </Icon>
  );
}

export function IconCross(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </Icon>
  );
}

export function IconPlay(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 4l14 8-14 8V4z" strokeLinejoin="round" />
    </Icon>
  );
}

export function IconPause(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M7 4v16M17 4v16" />
    </Icon>
  );
}

export function IconSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7M18.1 18.1l-1.7-1.7M7.6 7.6L5.9 5.9" />
    </Icon>
  );
}

export function IconSkipForward(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 5l9 7-9 7V5z" strokeLinejoin="round" />
      <path d="M18 5v14" />
    </Icon>
  );
}

export function IconTrophy(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
      <path d="M7 5H4a1 1 0 00-1 1v1a4 4 0 004 4M17 5h3a1 1 0 011 1v1a4 4 0 01-4 4" />
      <path d="M12 14v3M9 20h6M9.5 20a2.5 2.5 0 015 0" />
    </Icon>
  );
}

export function IconRefresh(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3" />
      <path d="M18 3v4.2h-4.2M6 21v-4.2h4.2" />
    </Icon>
  );
}

export function IconAlertSiren(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 20a7 7 0 0114 0H5z" />
      <path d="M12 4v3M4.5 8.5l2 1.5M19.5 8.5l-2 1.5" />
      <path d="M3 20h18" />
    </Icon>
  );
}

export function IconRotatePhone(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="7" y="2" width="10" height="16" rx="2" />
      <path d="M11 4.5h2" />
      <path d="M20 15a8 8 0 01-2.6 4.7M20 15h-3M20 15v3" />
    </Icon>
  );
}

export function IconFlag(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 3v18" />
      <path d="M5 4h11l-2.5 3.5L16 11H5" strokeLinejoin="round" />
    </Icon>
  );
}

export function IconChart(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M2.5 20h19" />
    </Icon>
  );
}

export function IconHistory(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9 2.5h6" />
    </Icon>
  );
}

export function IconDownload(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </Icon>
  );
}

export function IconWrench(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M14.7 6.3a4 4 0 00-5.4 5.1L4 16.7 7.3 20l5.3-5.3a4 4 0 005.1-5.4l-2.6 2.6-2.1-2.1 2.7-2.5z" strokeLinejoin="round" />
    </Icon>
  );
}

export function IconFlask(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M10 3h4M10 3v6.5L4.7 18a2 2 0 001.7 3h11.2a2 2 0 001.7-3L14 9.5V3" />
      <path d="M7 15h10" />
    </Icon>
  );
}
