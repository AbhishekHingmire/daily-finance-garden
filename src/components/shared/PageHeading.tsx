import React from "react";
import { PageHeader, type PageHeaderProps } from "./PageHeader";

export type PageHeadingProps = PageHeaderProps;

export function PageHeading(props: PageHeadingProps) {
  return <PageHeader {...props} />;
}
