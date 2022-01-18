import React, { Component } from 'react';
import { History } from 'history';

// Components
import { TabHeader } from '../../generic/TabHeader';
import { Filters } from './Filters';
import { ItemList } from './ItemList';
import { NarrativeDetails } from './NarrativeDetails';
import {
  Doc,
  KBaseCache,
  fetchOldVersionDoc,
} from '../../../utils/narrativeData';

// Utils
import { keepParamsLinkTo } from '../utils';
import Runtime from '../../../utils/runtime';
import searchNarratives, {
  sorts,
  SearchOptions,
} from '../../../utils/searchNarratives';
import { getUsername } from '../../../utils/auth';

// Page length of search results
const PAGE_SIZE = 20;
const NEW_NARR_URL = Runtime.getConfig().host_root + '/#narrativemanager/new';

interface State {
  // Currently activated narrative details
  activeIdx: number;
  cache: KBaseCache;
  // List of objects of narrative details
  items: Array<Doc>;
  // Whether we are loading data from the server
  loading: boolean;
  pages: number;
  // Parameters to send to searchNarratives
  searchParams: SearchOptions;
  totalItems: number;
  oldVersionDoc: Doc | null;
  oldVersionLoading: boolean;
}

interface Props {
  category: string;
  history: History;
  id: number;
  limit: number;
  obj: number;
  search: string;
  sort: string;
  ver: number;
  view: string;
}

const upaKey = (id: number, obj: number, ver: number) => `${id}/${obj}/${ver}`;

// This is a parent component to everything in the narrative browser (tabs,
// filters, search results, details, etc)
export class NarrativeList extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const { category, limit, search } = this.props;
    const sortDefault = Object.values(sorts)[0];
    this.state = {
      // Currently active narrative result, selected on the left and shown on the right
      // This is unused if the items array is empty.
      activeIdx: 0,
      cache: {
        objects: {},
      },
      // List of narrative data
      items: [],
      loading: false,
      // parameters to send to the searchNarratives function
      pages: parseInt((limit / PAGE_SIZE).toString()),
      searchParams: {
        term: search,
        sort: sortDefault,
        category: category,
        pageSize: limit || PAGE_SIZE,
      },
      totalItems: 0,
      oldVersionDoc: null,
      oldVersionLoading: false,
    };
  }

  componentDidMount() {
    // FIXME this is redundant with client/index.tsx
    getUsername((username) => {
      window._env.username = username;
      this.performSearch();
    });
  }

  async componentDidUpdate(prevProps: Props) {
    const { category, search } = this.props;
    const pageSize = this.props.limit || PAGE_SIZE;
    const sort = sorts[this.props.sort];
    const nextSearchParams = { term: search, sort, category, pageSize };
    const performSearchCondition =
      prevProps.category !== this.props.category ||
      prevProps.id !== this.props.id ||
      prevProps.limit !== this.props.limit ||
      prevProps.search !== this.props.search ||
      prevProps.sort !== this.props.sort;
    if (performSearchCondition) {
      await this.performSearch(nextSearchParams);
      this.setState({
        searchParams: nextSearchParams,
      });
    }

    this.checkSelectedVersion();
  }

  checkSelectedVersion() {
    // check if item is a previous version
    // if user selected an earlier version of a narrative, we need to fetch it separately
    // as the search service does not index prior versions
    const { ver } = this.props;
    if (!this.state.items.length) {
      return;
    }

    const activeItem = this.state.items[this.state.activeIdx];

    if (this.state.oldVersionDoc) {
      if (this.state.oldVersionDoc.version !== ver) {
        if (ver >= activeItem.version) {
          this.setState(() => ({ oldVersionDoc: null }));
          if (ver > activeItem.version) {
            this.performSearch(this.state.searchParams, true);
          }
        } else {
          this.updateVersionDoc();
        }
      }
    } else {
      if (activeItem.version > ver && ver > 0) {
        this.updateVersionDoc();
      }
    }
  }

  async updateVersionDoc() {
    if (this.state.oldVersionLoading) {
      return;
    }
    const { id, obj, ver } = this.props;
    // prevents attempt to fetch previous version with no active item selected
    if (id === 0 && obj === 0 && ver === 0) {
      // clear old version when user navigates to new category or selected item
      this.setState({ oldVersionDoc: null });
      return;
    }

    this.setState({ oldVersionLoading: true });

    const oldVersionDoc = await fetchOldVersionDoc(id, obj, ver);
    // TODO: This result should come from NarrativeService
    oldVersionDoc.obj_id = obj;
    this.setState({ oldVersionDoc, oldVersionLoading: false });
  }

  // Handle an onSetSearch callback from Filters
  async handleSearch(
    searchP: { term: string; sort: string },
    invalidateCache: boolean = false
  ): Promise<void> {
    const searchParams = this.state.searchParams;
    searchParams.term = searchP.term;
    searchParams.sort = searchP.sort;
    await this.performSearch(searchParams, invalidateCache);
  }

  // Handle an onSelectItem callback from ItemList
  // Receives the index of the selected item
  handleSelectItem(idx: number) {
    this.setState({ activeIdx: idx });
  }

  // Perform a search and return the Promise for the fetch
  async performSearch(
    searchParams?: SearchOptions,
    invalidateCache: boolean = false
  ) {
    if (!searchParams) {
      searchParams = this.state.searchParams;
    }
    this.setState({ loading: true });
    const requestedId = this.props.id;
    const cache = this.state.cache;
    const initializeCacheCondition = invalidateCache || !('search' in cache);
    if (initializeCacheCondition) {
      cache.search = {};
    }
    const resp = await searchNarratives(searchParams, cache.search);

    // TODO handle error from server
    if (!resp || !resp.hits) {
      return;
    }
    const total = resp.count;
    const items = resp.hits;
    // Is the requested id in these results?
    const requestedItemArr = items
      .map<[number, Doc]>((item, idx) => [idx, item])
      .filter(([idx, item]) => item.access_group === requestedId);
    let requestedItemIdx = 0;
    if (requestedItemArr.length === 1) {
      requestedItemIdx = requestedItemArr[0][0];
    }
    // If we are loading a subsequent page, append to items. Otherwise, replace them.
    this.setState({
      activeIdx: requestedItemIdx,
      cache,
      items,
      loading: false,
      totalItems: total,
    });
  }

  render() {
    const { category, id, obj, sort, view, ver } = this.props;
    const upa = upaKey(id, obj, ver);
    const keepSort = (link: string) =>
      keepParamsLinkTo(['sort', 'search'], link);
    const tabs = Object.entries({
      own: {
        name: 'My Narratives',
        link: keepSort('/'),
      },
      shared: {
        name: 'Shared With Me',
        link: keepSort('/shared/'),
      },
      tutorials: {
        name: 'Tutorials',
        link: keepSort('/tutorials/'),
      },
      public: {
        name: 'Public',
        link: keepSort('/public/'),
      },
    });

    const activeItem = this.state.items[this.state.activeIdx];
    return (
      <div className="bg-light-gray w-100">
        <div
          className="flex justify-between bb b--black-30"
          style={{ alignItems: 'stretch' }}
        >
          {/* Tab sections */}
          <div className="pt2">
            <TabHeader tabs={tabs} selected={category} />
          </div>

          {/* New narrative button */}
          <a
            className="button clickable narrative-new"
            href={NEW_NARR_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="mr1 fa fa-plus"></i> New Narrative
          </a>
        </div>

        <div>
          {/* Search, sort, filter */}
          <Filters
            category={category}
            history={this.props.history}
            loading={this.state.loading}
            onSetSearch={this.handleSearch.bind(this)}
            search={this.props.search}
            sort={sort}
          />

          {/* Narrative listing and side-panel details */}
          <div className="flex">
            <ItemList
              category={category}
              items={this.state.items}
              loading={this.state.loading}
              onSelectItem={this.handleSelectItem.bind(this)}
              pageSize={PAGE_SIZE}
              selected={upa}
              selectedIdx={this.state.activeIdx}
              sort={sort}
              totalItems={this.state.totalItems}
              history={this.props.history}
            />

            {activeItem ? (
              <NarrativeDetails
                activeItem={activeItem}
                cache={this.state.cache}
                view={view}
                updateSearch={() => this.performSearch()}
                previousVersion={this.state.oldVersionDoc}
                category={category}
                loading={this.state.oldVersionLoading}
                history={this.props.history}
              />
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    );
  }
}
