import type { ReactNode } from 'react';

/** Numbered section heading shared by the card editors. `classes` is the shared CSS module. */
export default function EditorSection({ number, title, classes, children }: {
  number: string; title: string; classes: Record<string, string>; children?: ReactNode;
}) {
  return <>
    <div className={classes.sectionHeader}><h2>{title}</h2><span aria-hidden="true">{number}</span></div>
    {children}
  </>;
}
