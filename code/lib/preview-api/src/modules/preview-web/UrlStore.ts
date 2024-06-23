import { global } from '@storybook/global';
import * as pq from 'picoquery';
import type { ViewMode } from '@storybook/types';

import { parseArgsParam } from './parseArgsParam';
import type { SelectionSpecifier, SelectionStore, Selection } from './SelectionStore';

const { history, document } = global;

export function pathToId(path: string) {
  const match = (path || '').match(/^\/story\/(.+)/);
  if (!match) {
    throw new Error(`Invalid path '${path}',  must start with '/story/'`);
  }
  return match[1];
}

const getQueryString = ({
  selection,
  extraParams,
}: {
  selection?: Selection;
  extraParams?: Record<PropertyKey, unknown>;
}) => {
  const search =
    typeof document !== 'undefined' && document.location.search
      ? document.location.search.slice(1)
      : '';
  const { path, selectedKind, selectedStory, ...rest } = pq.parse(search);
  return (
    '?' +
    pq.stringify({
      ...rest,
      ...extraParams,
      ...(selection && { id: selection.storyId, viewMode: selection.viewMode }),
    })
  );
};

export const setPath = (selection?: Selection) => {
  if (!selection) return;
  const query = getQueryString({ selection });
  const { hash = '' } = document.location;
  document.title = selection.storyId;
  history.replaceState({}, '', `${document.location.pathname}${query}${hash}`);
};

type ValueOf<T> = T[keyof T];
const isObject = (val: Record<string, any>): val is object =>
  val != null && typeof val === 'object' && Array.isArray(val) === false;

const getFirstString = (v: ValueOf<Record<PropertyKey, unknown>>): string | void => {
  if (v === undefined) {
    return undefined;
  }
  if (typeof v === 'string') {
    return v;
  }
  if (Array.isArray(v)) {
    return getFirstString(v[0]);
  }
  if (isObject(v as Record<PropertyKey, unknown>)) {
    return getFirstString(
      Object.values(v as Record<PropertyKey, unknown>).filter(Boolean) as string[]
    );
  }
  return undefined;
};

export const getSelectionSpecifierFromPath: () => SelectionSpecifier | null = () => {
  if (typeof document !== 'undefined') {
    const queryStr = document.location.search ? document.location.search.slice(1) : '';
    const query = pq.parse(queryStr);
    const args = typeof query.args === 'string' ? parseArgsParam(query.args) : undefined;
    const globals = typeof query.globals === 'string' ? parseArgsParam(query.globals) : undefined;

    let viewMode = getFirstString(query.viewMode) as ViewMode;
    if (typeof viewMode !== 'string' || !viewMode.match(/docs|story/)) {
      viewMode = 'story';
    }

    const path = getFirstString(query.path);
    const storyId = path ? pathToId(path) : getFirstString(query.id);

    if (storyId) {
      return { storySpecifier: storyId, args, globals, viewMode };
    }
  }

  return null;
};

export class UrlStore implements SelectionStore {
  selectionSpecifier: SelectionSpecifier | null;

  selection?: Selection;

  constructor() {
    this.selectionSpecifier = getSelectionSpecifierFromPath();
  }

  setSelection(selection: Selection) {
    this.selection = selection;
    setPath(this.selection);
  }

  setQueryParams(queryParams: Record<PropertyKey, unknown>) {
    const query = getQueryString({ extraParams: queryParams });
    const { hash = '' } = document.location;
    history.replaceState({}, '', `${document.location.pathname}${query}${hash}`);
  }
}
