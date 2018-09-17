import * as React from 'react';
import * as _ from 'lodash';

import ReactImageFallback from 'react-image-fallback';

import {RouteComponentProps} from 'react-router';
import {withRouter} from 'react-router-dom'

import * as api_gateway from '../util/APIGateway';
import * as users_cache from '../util/UsersCache';
import * as util from '../util/Util';

import {Logger} from '../util/Logging'

import {
	UserInfo,
	Auth0Identity,
	Auth0Profile,
	UserProfile,
	IdentityProvider
} from '../models/models'

// Material UI

import {
	createStyles,
	StyleRulesCallback,
	Theme,
	withStyles,
	WithStyles 
} from '@material-ui/core/styles';

import Avatar from '@material-ui/core/Avatar';
import Badge from '@material-ui/core/Badge';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableFooter from '@material-ui/core/TableFooter';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField'
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import SendIcon from '@material-ui/icons/Send';

const log = Logger.Make('debug', 'Search');

const AVATAR_SIZE = 64;

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
	},
	section_explanation: {
		textAlign: 'center',
		margin: 0,
		paddingLeft: 0,
		paddingRight: 0,
		paddingTop: theme.spacing.unit * 2,
		paddingBottom: 0,
	},
	explanation_title: {
		margin: 0,
		padding: 0
	},
	explanation_p: {
		paddingTop: theme.spacing.unit,
		lineHeight: 1.75
	},
	explanation_productLink: {
		color: 'inherit',
		textDecoration: 'underline',
		textDecorationColor: 'rgba(193,193,193,0.6)',
	//	textDecorationColor: theme.palette.divider
	},
	section_searchFields: {
		marginTop: theme.spacing.unit * 2,
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'flex-end'
	},
	section_searchResults: {
	//	marginLeft: theme.spacing.unit,
	//	marginRight: theme.spacing.unit
	},
	searchTextField: {
		width: 175,
		marginLeft: 32, // offset to center context, exclusive of circular progress
		marginRight: 12
	},
	searchProvidersButton: {
		minWidth: 48,
		maxWidth: 48,
		minHeight: 48,
		maxHeight: 48,
		padding: 0,
		borderRadius: '50%'
	},
	progress: {
		marginTop: 0,
		marginBottom: 16,
		marginLeft: theme.spacing.unit * 2,
	},
	progressHidden: {
		marginTop: 0,
		marginBottom: 16,
		marginLeft: theme.spacing.unit * 2,
		visibility: 'hidden',
	},
	noSearchResults: {
		textAlign: 'center',
		paddingTop: theme.spacing.unit * 2,
		lineHeight: 1.75
	},
	table: {
		minWidth: 400,
		marginTop: theme.spacing.unit * 2,
	//	backgroundColor: 'pink'
	},
	tableRow_containerIdentity: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'flex-start',
		alignItems: 'center',
		alignContent: 'center',
		marginLeft: theme.spacing.unit,
		marginRight: theme.spacing.unit,
		marginTop: 4,
		marginBottom: 4
	},
	tableRow_avatar: {
		flexBasis: 'auto',
		margin: 0,
		padding: 0,
		width: AVATAR_SIZE,
		height: AVATAR_SIZE
	},
	avatar: {
		margin: 0,
		padding: 0,
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		boxShadow: '#C1C1C1 0px 0px 2px'
	},
	avatarImg: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE
	},
	tableRow_nameAndProvider: {
		display: 'flex',
		flexDirection: 'column',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'flex-start',
		alignContent: 'flex-start',
		marginLeft: theme.spacing.unit * 2, // from avatar
		marginRight: 0,
		marginTop: 4,
		marginBottom: 4
	},
	tableRow_containerButtons: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'flex-end',
		alignItems: 'center',
		alignContent: 'center',
		marginLeft: 0, // see: tableRow_containerIdentity.marginLeft
		marginRight: theme.spacing.unit,
		marginTop: 2,
		marginBottom: 2
	},
	identityProviderImg: {
		backgroundColor: 'rgb(255,255,255)',
		paddingLeft: 6,
		paddingRight: 6,
		paddingTop: 3,
		paddingBottom: 3,
		borderRadius: 3
	},
	spanBold: {
		fontWeight: "bold"
	},
	listItemIcon_avatar: {
		width: 32,
		height: 32
	},
	listItemIcon_avatar_img: {
		width: 32,
		height: 32
	},
	listItemText: {
		marginLeft: 0,
		paddingLeft: 0
	},
	sendIcon: {
		width: 24,
		height: 24
	},
	wrap: {
		'overflow-wrap': 'break-word',
		wordWrap: 'break-word',
		wordBreak: 'break-all',
		overflowWrap: 'break-word'
	},
	divider_yesResults: {
		marginTop: theme.spacing.unit * 2,
		padding: 0,
		maxWidth: 600,
		[theme.breakpoints.up('sm')]: {
			minWidth: 600
		},
		[theme.breakpoints.only('xs')]: {
			minWidth: '100%',
			width: '100%',
		}
	},
	divider_noResults: {
		marginTop: theme.spacing.unit * 10,
		padding: 0,
		maxWidth: 600,
		[theme.breakpoints.up('sm')]: {
			minWidth: 600
		},
		[theme.breakpoints.only('xs')]: {
			minWidth: '100%',
			width: '100%',
		}
	},
	section_footer: {
		marginTop: theme.spacing.unit * 2,
		padding: 0
	},
	footer_text: {
		margin: 0,
		paddingTop: 0,
		paddingBottom: 0,
		paddingLeft: theme.spacing.unit * 2,
		paddingRight: theme.spacing.unit * 2,
		textAlign: 'center',
		fontFamily: '"Exo 2"',
		color: 'rgba(255,255,255,0.8)',
		lineHeight: 1.75
	},
	footer_productLink: {
		color: 'inherit',
		textDecoration: 'underline',
		textDecorationColor: 'rgba(193,193,193,0.6)',
	}
});

interface Auth0Profile_SearchResult extends Auth0Profile {
	/* 
		...Auth0Profile
	*/
	matches    : SearchMatchInfo[], // added during post-processing
	displayIdx : number             // added during post-processing
}

interface SearchResult extends UserProfile {
	s4    : UserInfo,
	auth0 : Auth0Profile_SearchResult
}

interface SearchResults {
	provider : string,
	query    : string,
	mode     : string,
	limit    : number,
	offset   : number,
	results  : SearchResult[],
}

interface StringRange {
	indexStart : number,
	indexEnd   : number
}

interface SearchMatchInfo {
	idx         : number,
	boldRanges  : StringRange[],
	points      : number
}

interface UserIdentsMenuButtonClickedOptions {
	userID      : string,
	sourceIdx   : number,
	selectedIdx : number
}

interface ISearchProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
}

interface ISearchState {

	// Fetching list of identity providers (from 4th-A server).
	// 
	isFetchingIdentityProviders : boolean,
	identityProviders           : IdentityProvider[]

	// Identity providers menu.
	// Defaults to "All Providers" (idpMenuSelectedIndex < 0)
	// 
	idpMenuButtonAnchor         : HTMLElement|null,
	idpMenuOpen                 : boolean,
	idpMenuSelectedIndex        : number,

	// Searching
	// 
	searchTextFieldStr          : string,
	searchQueryIndex            : number, // if (searchQueryIndex > searchResultsIndex)
	searchResultsIndex          : number, // then query is in progress
	searchResults               : SearchResults|null
	searchResultsPerPage        : number,

	// User identity menu
	userIdentsMenuAnchor        : HTMLElement|null,
	userIdentsMenuOpen          : string|null,
	userIdentsMenuSourceIndex   : number, // state.searchResults.results[here]
	userIdentsMenuSelectedIndex : number
}

class Search extends React.Component<ISearchProps, ISearchState> {

	private lastSearchTextFieldClick: number = 0;
	private lastTableButtonClick: number = 0;

	public state: ISearchState = {
		isFetchingIdentityProviders : false,
		identityProviders           : [],
		
		idpMenuButtonAnchor         : null,
		idpMenuOpen                 : false,
		idpMenuSelectedIndex        : -1,

		searchTextFieldStr          : '',
		searchQueryIndex            : 0,
		searchResultsIndex          : 0,
		searchResults               : null,
		searchResultsPerPage        : 25,

		userIdentsMenuAnchor        : null,
		userIdentsMenuOpen          : null,
		userIdentsMenuSourceIndex   : 0, // state.searchResults.results[here]
		userIdentsMenuSelectedIndex : 0
	};

	private displayNameForProvider = (provider: string): string => {

		for (const idp of this.state.identityProviders)
		{
			if (idp.id == provider) {
				return idp.displayName;
			}
		}

		return provider;
	};

	private fetchIdentityProviders = ()=> {

		this.setState({
			isFetchingIdentityProviders: true
		});

		const url = 'https://pzg66sum7l.execute-api.us-west-2.amazonaws.com/dev/config';
		fetch(url).then((response)=> {

			 return response.json();

		}).then((json: any)=>{

			const updatedState: Partial<ISearchState> = {
				isFetchingIdentityProviders: false
			};

			let idp: IdentityProvider[]|null = null;
			if (_.isObject(json) && _.isArray(json.identityProviders))
			{
				let isValid = true;
				for (const obj of json.identityProviders)
				{
					if (!_.isString(obj.id) || !_.isString(obj.displayName)) {
						isValid = false;
					}
				}

				if (isValid)
				{
					idp = json.identityProviders as IdentityProvider[];
					idp.sort((a, b)=>{
						return a.displayName.localeCompare(b.displayName);
					});

					updatedState.identityProviders = idp;
				}
				else
				{
					log.err("!isValid: json !!!")
				}
			}

			this.setState((current)=> { return {
				...current,
				...updatedState
			}});

		}).catch((err)=> {

			log.err('Error fetching socialmediaproviders.json: ' + err);

			this.setState({
				isFetchingIdentityProviders: false
			});
		});
	}

	protected idpMenuButtonClicked = (event: React.MouseEvent<HTMLElement>)=> {
		log.debug('idpMenuButtonClicked()');

		this.setState({
			idpMenuButtonAnchor : event.currentTarget,
			idpMenuOpen         : true
		});
	}

	protected idpMenuItemSelected = (
		index: number,
		event: React.MouseEvent<HTMLElement>
	): void =>
	{
		log.debug(`idpMenuItemSelected(${index})`);

		this.setState({
			idpMenuButtonAnchor  : null,
			idpMenuOpen          : false,
			idpMenuSelectedIndex : index
		});
	}

	protected idpMenuClosed = ()=> {
		log.debug('idpMenuClosed()');

		this.setState({
			idpMenuButtonAnchor : null,
			idpMenuOpen         : false
		});
	}

	protected userIdentsMenuButtonClicked = (
		options : UserIdentsMenuButtonClickedOptions,
		event   : React.MouseEvent<HTMLElement>
	): void => {
		log.debug("userIdentsMenuButtonClicked()");
		
		this.setState({
			userIdentsMenuAnchor        : event.currentTarget,
			userIdentsMenuOpen          : options.userID,
			userIdentsMenuSourceIndex   : options.sourceIdx,
			userIdentsMenuSelectedIndex : options.selectedIdx
		});

		this.lastTableButtonClick = Date.now();
	}

	protected userIdentsMenuItemSelected = (
		index : number,
		event : React.MouseEvent<HTMLElement>
	): void =>
	{
		log.debug(`userIdentsMenuItemSelected(${index})`);

		this.setState((current)=> {

			const s: ISearchState = {
				...current,
			};
			
			if (s.searchResults)
			{
				const results = s.searchResults.results;
				const source = s.userIdentsMenuSourceIndex;

				if (source >= 0 && source < results.length)
				{
					results[source].auth0.displayIdx = index;
				}
			}

			s.userIdentsMenuAnchor        = null;
			s.userIdentsMenuOpen          = null;
			s.userIdentsMenuSourceIndex   = -1;
			s.userIdentsMenuSelectedIndex = -1;

			return s;
		});
	}

	protected userIdentsMenuClosed = ()=> {
		log.debug("userIdentsMenuClosed()");

		this.setState({
			userIdentsMenuAnchor        : null,
			userIdentsMenuOpen          : null,
			userIdentsMenuSourceIndex   : -1,
			userIdentsMenuSelectedIndex : -1,
		});
	}

	protected searchTextFieldChanged = (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
	) => {
		const newValue = event.target.value;
		log.debug("searchTextFieldChanged() => "+ newValue);

		const now = Date.now();
		const diff = now - this.lastSearchTextFieldClick;
		const clearButtonClickDetected = (diff < 20);

		if (false && clearButtonClickDetected)
		{
			this.setState({
				searchTextFieldStr: newValue,
				searchResults: null
			});
		}
		else
		{
			this.setState({
				searchTextFieldStr: newValue
			});	
		}
	}

	protected searchTextFieldKeyPress = (
		event: React.KeyboardEvent<HTMLDivElement>
	): void => {
		log.debug("searchTextFieldKeyPress().type =>"+ event.type);

		if (event.key === 'Enter')
		{
			this.submitSearch();
		}
	}

	protected searchTextFieldClick = (
		event: React.MouseEvent<HTMLDivElement>
	): void =>
	{
		log.debug("searchTextFieldKeyPress().type =>"+ event.type);

		// This method gets called for ANY click on the textField.
		// What we're trying to do is detect when the user clicks the x/clear button.
		// The events we do get:
		// 1. onClick
		// 2. onChange
		// 
		// So if these two methods get called back-to-back,
		// then we can detect when the user clears the textField.

		this.lastSearchTextFieldClick = Date.now();
	}

	protected submitSearch = (
		page ?: number
	): void =>
	{
		log.debug("submitSearch(): "+ this.state.searchTextFieldStr);

		page = page || 0;

		const state = this.state;

		const search_query = state.searchTextFieldStr.trim();
		const searchQueryIndex = state.searchQueryIndex + 1;

		let search_provider: string = "*"
		if (state.idpMenuSelectedIndex >= 0) {
			search_provider = state.identityProviders[state.idpMenuSelectedIndex].id;
		}

		const emptySearchResults: SearchResults = {
			provider : search_provider,
			query    : search_query,
			mode     : "boolean",
			limit    : state.searchResultsPerPage,
			offset   : (state.searchResultsPerPage * page),
			results  : [],
		};

		if (search_query.length == 0)
		{
			this.setState({
				searchQueryIndex   : searchQueryIndex,
				searchResultsIndex : searchQueryIndex,
				searchResults      : emptySearchResults
			});
			return;
		}

		const host = api_gateway.getHost();
		const path = api_gateway.getPath("/auth0/search");

		const body = {
			provider : search_provider,
			query    : search_query
		};

		const url = `https://${host}${path}`;
		let searchResults: SearchResults|null = null;

		this.setState({
			searchQueryIndex
		});

		fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body, null, 0)

		}).then((response)=> {

			return response.json();
		
		}).then((json)=> {

			searchResults = json;
			if (searchResults)
			{
				// The 'query' property returned from the server corresponds to how
				// it processed the item after massaging it for a 'boolean' mode in the DB.
				// This doesn't really help us.
				// We really want to store the original search query, as the user typed it.
				// So we'll override that here.
				// 
				searchResults.query = search_query;

				// Now we need to calculate various information about how
				// each search result matches the given query.
				// 
				for (const searchResult of searchResults.results)
				{
					this.postProcessSearchResult(search_query, searchResult);
				}
			}

		}).catch((reason)=> {

			log.err("Error fetching search results: "+ reason);

		}).then(() => { // .finally()

			searchResults = searchResults || emptySearchResults;

			this.setState((current) => {

				if (searchQueryIndex <= current.searchResultsIndex)
				{
					// Ignore search results.
					// We're already displaying the search results from a more recent query.
					return current;
				}
				
				const updated: ISearchState = {
					...current,
					searchResults: searchResults,
					searchResultsIndex: searchQueryIndex
				};
				return updated;

			}, ()=> {
	
			//	const sr = this.state.searchResults;
			//	if (sr) 
			//	{
			//		const q = sr.query;
			//		log.debug("Updated state: A");
			//
			//		this.props.history.replace(`/search?q=${q}`);
			//	}
			});
		});
	}

	protected postProcessSearchResult = (
		query        : string,
		searchResult : SearchResult
	): void =>
	{
		const queryComponents = query.split(' ').filter((str)=> {
			return str.length > 0;
		}).map((str)=> {
			return str.toLowerCase();
		});

		const identities = searchResult.auth0.identities;
		searchResult.auth0.matches = [];

		identities.forEach((identity, identityIdx) => {

			const matchInfo: SearchMatchInfo = {
				idx        : identityIdx,
				boldRanges : [],
				points     : 0
			};

			const displayName = util.displayNameForIdentity(identity, searchResult.s4).toLowerCase();

			const imgUrl = util.imageUrlForIdentity(identity, searchResult.s4);
			if (imgUrl != null) {
				matchInfo.points++;
			}

			for (const queryComponent of queryComponents)
			{
				const matchIndex = displayName.indexOf(queryComponent);
				if (matchIndex >= 0)
				{
					const range: StringRange = {
						indexStart : matchIndex,
						indexEnd   : matchIndex + queryComponent.length
					};

					matchInfo.boldRanges.push(range);
					matchInfo.points++;
				}
			}

			// The queryComponents could be something like: [
			//   'foo',
			//   'foob'
			// ]
			// 
			// And the displayName could be: 'foobar'
			// 
			// So the boldRanges would overlap: [
			//   {0, 3},
			//   {0, 4}
			// ]
			//
			// So we need to merge all the ranges.
			// 
			if (matchInfo.boldRanges.length > 0)
			{
				const stack: StringRange[] = [];

				matchInfo.boldRanges.sort((a, b)=> {
					return a.indexStart - b.indexStart;
				});

				stack.push(matchInfo.boldRanges[0]);

				matchInfo.boldRanges.slice(1).forEach((range, i)=> {

					const top = stack[stack.length - 1];
			
					if (top.indexEnd < range.indexStart) {
			
						// No overlap, push range onto stack
						stack.push(range);

					} else if (top.indexEnd < range.indexEnd) {
			
						// Update previous range
						top.indexEnd = range.indexEnd;
					}
				});

				matchInfo.boldRanges = stack;
			}

			searchResult.auth0.matches.push(matchInfo);
		});

		const sortedMatches = Array.from(searchResult.auth0.matches);
		sortedMatches.sort((a, b)=> {

			// If compareFunction(a, b) returns less than 0,
			// sort a to an index lower than b, i.e. a comes first.
			//
			// If compareFunction(a, b) returns 0,
			// leave a and b unchanged with respect to each other,
			// but sorted with respect to all different elements.
			// 
			// If compareFunction(a, b) returns greater than 0,
			// sort b to an index lower than a, i.e. b comes first.

			let a_points = a.points;
			let b_points = b.points;

			let diff = b_points - a_points;
			if (diff != 0) {
				return diff;
			}

			const preferred =
			  searchResult.auth0.user_metadata.preferedAuth0ID ||
			  searchResult.auth0.user_metadata.preferredAuth0ID;

			const a_identity = searchResult.auth0.identities[a.idx];
			const b_identity = searchResult.auth0.identities[b.idx];

			const a_id = a_identity.provider +'|'+ a_identity.user_id;
			const b_id = b_identity.provider +'|'+ b_identity.user_id;

			if (preferred == a_id) {
				a_points++;
			}
			if (preferred == b_id) {
				b_points++;
			}

			diff = b_points - a_points;
			return diff;
		});

		const bestMatchIdx = sortedMatches[0].idx;
		searchResult.auth0.displayIdx = bestMatchIdx;

		log.debug('searchResult.auth0: '+ JSON.stringify(searchResult.auth0, null, 2));
	}

	protected initialsForDisplayName = (
		displayName: string
	): string =>
	{
		const components = displayName.split(" ").filter((str)=> {
			return str.length > 0;
		});

		if (components.length >= 2)
		{
			const first = components[0];
			const last  = components[components.length - 1];

			return (first[0] + last[0]).toUpperCase();
		}
		else
		{
			return components[0].slice(0, 2);
		}
	};

	protected searchResultsTable_changePage = (
		event: React.MouseEvent<HTMLButtonElement>,
		page: number
	): void =>
	{
		log.debug("searchResultsTable_changePage()");

		// Todo...
	};

	protected searchResultsTable_changeRowsPerPage = (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	): void =>
	{
		log.debug("searchResultsTable_changeRowsPerPage()");

		// Todo...
	};

	protected searchResultsTable_selectUser = (
		user_id : string,
		event   : string
	): void =>
	{
		log.debug("searchResultsTable_selectUser(): "+ user_id);

		// This method is ALSO called when the tableCell buttons are clicked.
		// Luckily it's called afterwards.
		// So we setup this little "time ellapsed" workaround to ignore when click is on a button.

		const now = Date.now();
		const last = this.lastTableButtonClick;
		const diff = now - last;

		if (diff > 20)
		{
			let user_profile: UserProfile|null = null;
			let identity: Auth0Identity|null = null;

			const searchResults = this.state.searchResults;
			if (searchResults)
			{
				for (const result of searchResults.results)
				{
					if (result.s4.user_id == user_id)
					{
						user_profile = result;
						identity = result.auth0.identities[result.auth0.displayIdx];
						break;
					}
				}
			}

			if (user_profile)
			{
				users_cache.addToCache(user_profile);
			}
			
			let url = `/id/${user_id}`;
			if (identity) {
				const idh = util.idhForIdentity(identity)
				url += `?idh=${idh}`
			}

			this.props.history.push(url);
		}
	}

	protected renderSearchFields(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		let providerIcon: React.ReactNode;
		if (state.idpMenuSelectedIndex >= 0)
		{
			const idp = state.identityProviders[state.idpMenuSelectedIndex];
			providerIcon = (
				<img src={util.imageUrlForIdentityProvider_64(idp)} width="32" height="32" />
			);
		}
		else
		{
			providerIcon = (
				<MoreVertIcon/>
			);
		}

		let progressSection: React.ReactNode;
		if (state.searchQueryIndex > state.searchResultsIndex)
		{
			progressSection = (
				<CircularProgress className={classes.progress} color="secondary" size={16} />
			);
		}
		else {
			progressSection = (
				<CircularProgress className={classes.progressHidden} color="secondary" size={16} />
			);
		}

		return (
			<div className={classes.section_searchFields}>
				<TextField
					id="searchTextField"
					label="Search for user"
					type="search"
					className={classes.searchTextField}
					margin="normal"
					onChange={this.searchTextFieldChanged}
					onKeyPress={this.searchTextFieldKeyPress}
					onClick={this.searchTextFieldClick}
					
				/>
				<Button
					className={classes.searchProvidersButton}
					onClick={this.idpMenuButtonClicked}
					>
					{providerIcon}
				</Button>
				<Menu
					id="lock-menu"
					anchorEl={state.idpMenuButtonAnchor}
					open={state.idpMenuOpen}
					onClose={this.idpMenuClosed}
					PaperProps={{
						style: {
							maxHeight: 415
						}
					}}
				>
					<MenuItem
						key="-all-"
						selected={state.idpMenuSelectedIndex < 0}
						onClick={this.idpMenuItemSelected.bind(this, -1)}
					>
						Search All Providers
					</MenuItem>
					{state.identityProviders.map((idp, index) => {
						return (
							<MenuItem
								key={idp.id}
								selected={state.idpMenuSelectedIndex == index}
								onClick={this.idpMenuItemSelected.bind(this, index)}
							>
								<ListItemIcon>
							 		<img src={util.imageUrlForIdentityProvider_64(idp)} width="32" height="32" />
								</ListItemIcon>
								<ListItemText
									className={classes.listItemText}
									inset={true}
									primary={idp.displayName}
								/>
							</MenuItem>
						);
					})}
				</Menu>
				{progressSection}
			</div>
		);
	}

	public renderSearchResultsTable(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const searchResults = state.searchResults;
		if (searchResults == null) {
			return null;
		}

		if (searchResults.results.length == 0)
		{
			const is_searching = (state.searchQueryIndex > state.searchResultsIndex);
			if (is_searching) {
				return null;
			}

			let explanation: React.ReactNode;
			if (searchResults.provider == '*')
			{
				explanation = (
					<Typography
						variant="subheading"
						className={classes.noSearchResults}
					>
						No results found for query.
					</Typography>
				);
			}
			else
			{
				const providerDisplayName = this.displayNameForProvider(searchResults.provider);
				explanation = (
					<Typography
						variant="subheading"
						paragraph={true}
						className={classes.noSearchResults}
					>
						No results found for query.<br/>
						Your query is currently limited to '{providerDisplayName}'.
					</Typography>
				);
			}

			return (
				<div className={classes.section_searchResults}>
					{explanation}
				</div>
			);
		}

		const rowsPerPage = searchResults.limit;
		const page = searchResults.offset / rowsPerPage;

		return (
			<div className={classes.section_searchResults}>
				<Table className={classes.table}>
					<TableBody>
						{searchResults.results.map((searchResult, searchResultIdx) => {

							const user_id = searchResult.s4.user_id;

							const identities = searchResult.auth0.identities;
							const matches = searchResult.auth0.matches;

							const displayIdx = searchResult.auth0.displayIdx;

							const identity = identities[displayIdx];
							const match = matches[displayIdx];
							
							const displayName = util.displayNameForIdentity(identity, searchResult.s4);

							const idpUrl = util.imageUrlForIdentityProvider_signin(identity);
							const avatarUrl = util.imageUrlForIdentity(identity, searchResult.s4);

							const avatarSection = (
								<Avatar className={classes.avatar}>
									<ReactImageFallback
										src={avatarUrl || undefined}
										initialImage={
											<AccountCircleIcon className={classes.avatarImg} color="primary"/>
										}
										fallbackImage={
											<AccountCircleIcon className={classes.avatarImg} color="primary"/>
										}
										width={AVATAR_SIZE}
										height={AVATAR_SIZE}
									/>
								</Avatar>
							);
							
							let displayNameSection: React.ReactNode;
							if (match.boldRanges.length == 0)
							{
								displayNameSection = (
									<span key={user_id}>{displayName}</span>
								);
							}
							else
							{
								let lastIndex = 0;
								displayNameSection = (
									<React.Fragment key={user_id}>
									{match.boldRanges.map((range, rangeIdx) => {

										let result: React.ReactNode;

										const hasPrefix = range.indexStart > lastIndex;
										const hasSuffix =
										(range.indexEnd < displayName.length) &&
										(rangeIdx == match.boldRanges.length - 1);

										if (hasPrefix && hasSuffix)
										{
											const a = displayName.substring(lastIndex, range.indexStart);
											const b = displayName.substring(range.indexStart, range.indexEnd);
											const c = displayName.substring(range.indexEnd);

											result = (
												<React.Fragment key={`fragment_${rangeIdx}`}>
													<span key={`a_${rangeIdx}`}>{a}</span>
													<span key={`b_${rangeIdx}`} className={classes.spanBold}>{b}</span>
													<span key={`c_${rangeIdx}`}>{c}</span>
												</React.Fragment>
											);
										}
										else if (hasPrefix)
										{
											const a = displayName.substring(lastIndex, range.indexStart);
											const b = displayName.substring(range.indexStart, range.indexEnd);

											result = (
												<React.Fragment key={`fragment_${rangeIdx}`}>
													<span key={`${rangeIdx}_a`}>{a}</span>
													<span key={`${rangeIdx}_b`} className={classes.spanBold}>{b}</span>
												</React.Fragment>
											);
										}
										else if (hasSuffix)
										{
											const b = displayName.substring(range.indexStart, range.indexEnd);
											const c = displayName.substring(range.indexEnd);

											result = (
												<React.Fragment key={`fragment_${rangeIdx}`}>
													<span key={`${rangeIdx}_b`} className={classes.spanBold}>{b}</span>
													<span key={`${rangeIdx}_c`}>{c}</span>
												</React.Fragment>
											);
										}
										else
										{
											const b = displayName.substring(range.indexStart, range.indexEnd);

											result = (
												<span key={`${rangeIdx}_b`} className={classes.spanBold}>{b}</span>
											);
										}

										lastIndex = range.indexEnd;
										return result;
									})}
									</React.Fragment>
								);
							}

							let badgeOrNoBadge: React.ReactNode;
							if (identities.length > 1)
							{
								badgeOrNoBadge = (
									<Badge badgeContent={identities.length} color="primary">
										<AccountCircleIcon />
									</Badge>
								);	
							}
							else
							{
								badgeOrNoBadge = (
									<AccountCircleIcon />
								);
							}

							const onClick = this.searchResultsTable_selectUser.bind(this, user_id);

							const onClickOptions: UserIdentsMenuButtonClickedOptions = {
								userID      : user_id,
								sourceIdx   : searchResultIdx,
								selectedIdx : displayIdx
							};
							const onClickIdentities = this.userIdentsMenuButtonClicked.bind(this, onClickOptions);
							
							return (
								<TableRow key={searchResult.s4.user_id} hover={true} onClick={onClick}>
									<TableCell padding="none">
										<div className={classes.tableRow_containerIdentity}>
											<div className={classes.tableRow_avatar}>
												{avatarSection}
											</div>
											<div className={classes.tableRow_nameAndProvider}>
												<Typography variant="headline" className={classes.wrap}>{displayNameSection}</Typography>
												<img src={idpUrl} height="22" className={classes.identityProviderImg}/>
											</div>
										</div>
									</TableCell>
									<TableCell padding="none">
										<div className={classes.tableRow_containerButtons}>
											<Tooltip title="Show all identities linked to user's account.">
												<IconButton onClick={onClickIdentities}>
													{badgeOrNoBadge}
												</IconButton>
											</Tooltip>
											<Tooltip title="Send file(s) to user.">
												<IconButton onClick={onClick}>
													<SendIcon className={classes.sendIcon}/>
												</IconButton>
											</Tooltip>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
					<TableFooter>
						<TableRow>
							<TablePagination
								count={searchResults.results.length}
								rowsPerPage={rowsPerPage}
								page={page}
								onChangePage={this.searchResultsTable_changePage}
								onChangeRowsPerPage={this.searchResultsTable_changeRowsPerPage}
							/>
						</TableRow>
					</TableFooter>
				</Table>
				{searchResults.results.map((searchResult, searchResultIdx) => {

					const user_id = searchResult.s4.user_id;
					return (
						<Menu
							key={user_id}
							anchorEl={state.userIdentsMenuAnchor}
							open={state.userIdentsMenuOpen == user_id}
							onClose={this.userIdentsMenuClosed}
						>
						{searchResult.auth0.identities.map((identity, identityIdx)=> {

							const idpUrl = util.imageUrlForIdentityProvider_64(identity);
							const idUrl = util.imageUrlForIdentity(identity, searchResult.s4);
							const displayName = util.displayNameForIdentity(identity, searchResult.s4);
							
							const onClick = this.userIdentsMenuItemSelected.bind(this, identityIdx);

							return (
								<MenuItem
									key={`${user_id}|${identity.user_id}`}
									selected={state.userIdentsMenuSelectedIndex == identityIdx}
									onClick={onClick}
								>
									<ListItemIcon>
										 <img src={idpUrl} width="32" height="32" />
									</ListItemIcon>
									<ListItemIcon>
										<Avatar className={classes.listItemIcon_avatar}>
											<ReactImageFallback
												src={idUrl || undefined}
												initialImage={
													<AccountCircleIcon className={classes.listItemIcon_avatar_img} color="primary"/>
												}
												fallbackImage={
													<AccountCircleIcon className={classes.listItemIcon_avatar_img} color="primary"/>
												}
												width={32}
												height={32}
											/>
										</Avatar>
									</ListItemIcon>
									<ListItemText
										className={classes.listItemText}
										inset={true}
										primary={displayName}
									/>
								</MenuItem>
							);

						})}
						</Menu>
					);
				})}
			</div>
		);
	}

	public renderFooter(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		return (
			<div className={classes.section_footer}>
				<Typography className={classes.footer_text}>
					Crypto Cloud Storage<br/>
					<a href='https://www.storm4.cloud' className={classes.footer_productLink}>https://www.storm4.cloud</a>
				</Typography>
			</div>
		);
	}

	public render(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const section_search = this.renderSearchFields();
		const section_table  = this.renderSearchResultsTable();

		return (
			<div className={classes.root}>
				<div className={classes.section_explanation}>
					<Typography variant="display2" className={classes.explanation_title} >
						SEND FILES SECURELY
					</Typography><br/>
					<Typography variant="subheading" className={classes.explanation_p} >
						Send files to any <a href='https://www.storm4.cloud' className={classes.explanation_productLink}>Storm4</a> user.<br/>
						Files are encrypted in your browser before uploading.<br/>
						Only the recipient can decrypt & read the files you send.<br/>
						Storm4 users have their public keys secured on the blockchain.<br/>
					</Typography>
				</div>
				{section_search}
				{section_table}
			</div>
		);
	}

	public componentDidMount() {
		log.debug("componentDidMount()");

		this.fetchIdentityProviders();
	}
}

export default withStyles(styles)(withRouter(Search));
