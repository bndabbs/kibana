/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import './discover_grid.scss';
import {
  EuiDataGridSorting,
  EuiDataGridStyle,
  EuiDataGridProps,
  EuiDataGrid,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { getSchemaDetectors } from './discover_grid_schema';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { DiscoverGridContext } from './discover_grid_context';
import { getRenderCellValueFn } from './get_render_cell_value';
import { DiscoverGridSettings } from './types';
import { SortPairArr } from '../../angular/doc_table/lib/get_sort';
import {
  getEuiGridColumns,
  getLeadControlColumns,
  getVisibleColumns,
} from './discover_grid_columns';
import { defaultPageSize, gridStyle, pageSizeArr, toolbarVisibility } from './constants';
import { DiscoverServices } from '../../../build_services';
import { getDisplayedColumns } from '../../helpers/columns';
import { KibanaContextProvider } from '../../../../../kibana_react/public';

interface SortObj {
  id: string;
  direction: string;
}

export interface DiscoverGridProps {
  /**
   * Determines which element labels the grid for ARIA
   */
  ariaLabelledBy: string;
  /**
   * Determines which columns are displayed
   */
  columns: string[];
  /**
   * If set, the given document is displayed in a flyout
   */
  expandedDoc?: ElasticSearchHit;
  /**
   * The used index pattern
   */
  indexPattern: IndexPattern;
  /**
   * Function used to add a column in the document flyout
   */
  onAddColumn: (column: string) => void;
  /**
   * Function to add a filter in the grid cell or document flyout
   */
  onFilter: DocViewFilterFn;
  /**
   * Function used in the grid header and flyout to remove a column
   * @param column
   */
  onRemoveColumn: (column: string) => void;
  /**
   * Function triggered when a column is resized by the user
   */
  onResize?: (colSettings: { columnId: string; width: number }) => void;
  /**
   * Function to set all columns
   */
  onSetColumns: (columns: string[]) => void;
  /**
   * function to change sorting of the documents
   */
  onSort: (sort: string[][]) => void;
  /**
   * Array of documents provided by Elasticsearch
   */
  rows?: ElasticSearchHit[];
  /**
   * The max size of the documents returned by Elasticsearch
   */
  sampleSize: number;
  /**
   * Function to set the expanded document, which is displayed in a flyout
   */
  setExpandedDoc: (doc: ElasticSearchHit | undefined) => void;
  /**
   * Grid display settings persisted in Elasticsearch (e.g. column width)
   */
  settings?: DiscoverGridSettings;
  /**
   * Saved search description
   */
  searchDescription?: string;
  /**
   * Saved search title
   */
  searchTitle?: string;
  /**
   * Discover plugin services
   */
  services: DiscoverServices;
  /**
   * Determines whether the time columns should be displayed (legacy settings)
   */
  showTimeCol: boolean;
  /**
   * Current sort setting
   */
  sort: SortPairArr[];
  /**
   * How the data is fetched
   */
  useNewFieldsApi: boolean;
}

export const EuiDataGridMemoized = React.memo((props: EuiDataGridProps) => {
  return <EuiDataGrid {...props} />;
});

export const DiscoverGrid = ({
  ariaLabelledBy,
  columns,
  indexPattern,
  expandedDoc,
  onAddColumn,
  onFilter,
  onRemoveColumn,
  onResize,
  onSetColumns,
  onSort,
  rows,
  sampleSize,
  searchDescription,
  searchTitle,
  services,
  setExpandedDoc,
  settings,
  showTimeCol,
  sort,
  useNewFieldsApi,
}: DiscoverGridProps) => {
  const displayedColumns = getDisplayedColumns(columns, indexPattern);
  const defaultColumns = displayedColumns.includes('_source');

  /**
   * Pagination
   */
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });
  const rowCount = useMemo(() => (rows ? rows.length : 0), [rows]);
  const pageCount = useMemo(() => Math.ceil(rowCount / pagination.pageSize), [
    rowCount,
    pagination,
  ]);
  const isOnLastPage = pagination.pageIndex === pageCount - 1;

  const paginationObj = useMemo(() => {
    const onChangeItemsPerPage = (pageSize: number) =>
      setPagination((paginationData) => ({ ...paginationData, pageSize }));

    const onChangePage = (pageIndex: number) =>
      setPagination((paginationData) => ({ ...paginationData, pageIndex }));

    return {
      onChangeItemsPerPage,
      onChangePage,
      pageIndex: pagination.pageIndex > pageCount - 1 ? 0 : pagination.pageIndex,
      pageSize: pagination.pageSize,
      pageSizeOptions: pageSizeArr,
    };
  }, [pagination, pageCount]);

  /**
   * Sorting
   */
  const sortingColumns = useMemo(() => sort.map(([id, direction]) => ({ id, direction })), [sort]);

  const onTableSort = useCallback(
    (sortingColumnsData) => {
      onSort(sortingColumnsData.map(({ id, direction }: SortObj) => [id, direction]));
    },
    [onSort]
  );

  /**
   * Cell rendering
   */
  const renderCellValue = useMemo(
    () =>
      getRenderCellValueFn(
        indexPattern,
        rows,
        rows ? rows.map((hit) => indexPattern.flattenHit(hit)) : [],
        useNewFieldsApi
      ),
    [rows, indexPattern, useNewFieldsApi]
  );

  /**
   * Render variables
   */
  const showDisclaimer = rowCount === sampleSize && isOnLastPage;
  const randomId = useMemo(() => htmlIdGenerator()(), []);

  const euiGridColumns = useMemo(
    () => getEuiGridColumns(displayedColumns, settings, indexPattern, showTimeCol, defaultColumns),
    [displayedColumns, indexPattern, showTimeCol, settings, defaultColumns]
  );
  const schemaDetectors = useMemo(() => getSchemaDetectors(), []);
  const columnsVisibility = useMemo(
    () => ({
      visibleColumns: getVisibleColumns(displayedColumns, indexPattern, showTimeCol) as string[],
      setVisibleColumns: (newColumns: string[]) => {
        onSetColumns(newColumns);
      },
    }),
    [displayedColumns, indexPattern, showTimeCol, onSetColumns]
  );
  const sorting = useMemo(() => ({ columns: sortingColumns, onSort: onTableSort }), [
    sortingColumns,
    onTableSort,
  ]);
  const lead = useMemo(() => getLeadControlColumns(), []);

  if (!rowCount) {
    return (
      <div className="euiDataGrid__noResults">
        <EuiText size="xs" color="subdued">
          <EuiIcon type="discoverApp" size="m" color="subdued" />
          <EuiSpacer size="s" />
          <FormattedMessage id="discover.noResultsFound" defaultMessage="No results found" />
        </EuiText>
      </div>
    );
  }

  return (
    <DiscoverGridContext.Provider
      value={{
        expanded: expandedDoc,
        setExpanded: setExpandedDoc,
        rows: rows || [],
        onFilter,
        indexPattern,
        isDarkMode: services.uiSettings.get('theme:darkMode'),
      }}
    >
      <>
        <KibanaContextProvider services={{ uiSettings: services.uiSettings }}>
          <EuiDataGridMemoized
            aria-describedby={randomId}
            aria-labelledby={ariaLabelledBy}
            columns={euiGridColumns}
            columnVisibility={columnsVisibility}
            data-test-subj="docTable"
            gridStyle={gridStyle as EuiDataGridStyle}
            leadingControlColumns={lead}
            onColumnResize={(col: { columnId: string; width: number }) => {
              if (onResize) {
                onResize(col);
              }
            }}
            pagination={paginationObj}
            renderCellValue={renderCellValue}
            rowCount={rowCount}
            schemaDetectors={schemaDetectors}
            sorting={sorting as EuiDataGridSorting}
            toolbarVisibility={
              defaultColumns
                ? {
                    ...toolbarVisibility,
                    showColumnSelector: false,
                  }
                : toolbarVisibility
            }
          />
        </KibanaContextProvider>

        {showDisclaimer && (
          <p className="dscDiscoverGrid__footer">
            <FormattedMessage
              id="discover.howToSeeOtherMatchingDocumentsDescriptionGrid"
              defaultMessage="These are the first {sampleSize} documents matching your search, refine your search to see others."
              values={{ sampleSize }}
            />
            <a href={`#${ariaLabelledBy}`}>
              <FormattedMessage id="discover.backToTopLinkText" defaultMessage="Back to top." />
            </a>
          </p>
        )}
        {searchTitle && (
          <EuiScreenReaderOnly>
            <p id={String(randomId)}>
              {searchDescription ? (
                <FormattedMessage
                  id="discover.searchGenerationWithDescriptionGrid"
                  defaultMessage="Table generated by search {searchTitle} ({searchDescription})"
                  values={{ searchTitle, searchDescription }}
                />
              ) : (
                <FormattedMessage
                  id="discover.searchGenerationWithDescription"
                  defaultMessage="Table generated by search {searchTitle}"
                  values={{ searchTitle }}
                />
              )}
            </p>
          </EuiScreenReaderOnly>
        )}
        {expandedDoc && (
          <DiscoverGridFlyout
            indexPattern={indexPattern}
            hit={expandedDoc}
            // if default columns are used, dont make them part of the URL - the context state handling will take care to restore them
            columns={defaultColumns ? [] : displayedColumns}
            onFilter={onFilter}
            onRemoveColumn={onRemoveColumn}
            onAddColumn={onAddColumn}
            onClose={() => setExpandedDoc(undefined)}
            services={services}
          />
        )}
      </>
    </DiscoverGridContext.Provider>
  );
};
