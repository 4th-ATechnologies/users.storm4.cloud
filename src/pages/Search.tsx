import * as React from 'react';
import * as _ from 'lodash';
import ReactImageFallback from 'react-image-fallback';
import {isObject, isArray, isString}  from 'lodash';
import {RouteComponentProps} from 'react-router';
import {withRouter} from 'react-router-dom'

import * as apigateway from '../util/apigateway';
import {Logger} from '../util/logging'

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
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableFooter from '@material-ui/core/TableFooter';
import TableHead from '@material-ui/core/TableHead';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography';

import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import SendIcon from '@material-ui/icons/Send';

const log = Logger.Make('debug', 'Search');

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
	},
	section_explanation: {
		textAlign: 'center',
		paddingTop: theme.spacing.unit * 2,
		paddingBottom: theme.spacing.unit * 5,
	},
	section_searchFields: {
	//	marginLeft: theme.spacing.unit,
	//	marginRight: theme.spacing.unit
	},
	section_searchResults: {
	//	marginLeft: theme.spacing.unit,
	//	marginRight: theme.spacing.unit
	},
	searchTextField: {
		width: 225,
		marginRight: 12
	},
	progress: {
		marginTop: 0,
		marginBottom: 0,
		marginLeft: theme.spacing.unit * 2,
	},
	table: {
		minWidth: 400,
		marginTop: theme.spacing.unit * 2,
	//	backgroundColor: 'pink'
	},
	tableRow_container: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'flex-start',
		alignItems: 'center',
		alignContent: 'center',
		marginTop: 2,
		marginBottom: 2
	},
	tableRow_avatar: {
		flexBasis: 'auto',
		width: 64,
		height: 64
	},
	avatar: {
		margin: 0,
		padding: 0,
		width: 64,
		height: 64
	},
	tableRow_nameAndProvider: {
		display: 'flex',
		flexDirection: 'column',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'flex-start',
		alignContent: 'flex-start',
		marginLeft: 16
	},
	signInImg: {
		backgroundColor: 'rgb(255,255,255)',
		paddingLeft: 6,
		paddingRight: 6,
		paddingTop: 3,
		paddingBottom: 3,
		borderRadius: 3
	},
	spanBold: {
		fontWeight: "bold"
	}
});

interface IdentityProvider {
	id          : string,
	displayName : string,
	type        : number,
	eTag_64x64  : string,
	eTag_signin : string
}

interface Auth0Identity {
	user_id     : string,
	provider    : string,
	connection  : string,
	profileData : any
}

// This is how we receive it from the server
interface SearchResult {
	s4 : {
		user_id : string,
		bucket  : string,
		region  : string
	},
	auth0: {
		updated_at : string,
		user_metadata : {
			preferedAuth0ID  ?: string,
			preferredAuth0ID ?: string
		},
		identities: Auth0Identity[]
	}
}

interface SearchResults {
	provider : string,
	query    : string,
	mode     : string,
	limit    : number,
	offset   : number,
	results  : SearchResult[],
	matches  : SearchMatchInfo[]
}

interface StringRange {
	indexStart : number,
	indexEnd   : number
}

interface SearchMatchInfo {
	identityIdx : number,
	displayName : string,
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

	searchTextFieldStr          : string,
	searchQueryIndex            : number, // if (searchQueryIndex > searchResultsIndex)
	searchResultsIndex          : number, // then query is in progress
	searchResults               : SearchResults|null
	searchResultsPerPage        : number,

	userIdentsMenuAnchor        : HTMLElement|null,
	userIdentsMenuOpen          : string|null,
	userIdentsMenuSourceIndex   : number, // state.searchResults.results[here]
	userIdentsMenuSelectedIndex : number,
}

class Search extends React.Component<ISearchProps, ISearchState> {

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
		userIdentsMenuSelectedIndex : 0,
	};

	private urlForIdentityProvider_64 = (idp: IdentityProvider|Auth0Identity)=> {

		let idp_id: string;
		if ((idp as IdentityProvider).id) {
			idp_id = (idp as IdentityProvider).id
		}
		else {
			idp_id = (idp as Auth0Identity).provider;
		}

		return `https://s3-us-west-2.amazonaws.com/com.4th-a.resources/socialmediaicons/64x64/${idp_id}.png`;
	}

	private urlForIdentityProvier_signin = (idp: IdentityProvider|Auth0Identity)=> {

		let idp_id: string;
		if ((idp as IdentityProvider).id) {
			idp_id = (idp as IdentityProvider).id
		}
		else {
			idp_id = (idp as Auth0Identity).provider;
		}

		return `https://s3-us-west-2.amazonaws.com/com.4th-a.resources/socialmediaicons/signin/${idp_id}.png`;
	}

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
			if (isObject(json) && isArray(json.identityProviders))
			{
				let isValid = true;
				for (const obj of json.identityProviders)
				{
					if (!isString(obj.id) || !isString(obj.displayName)) {
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

	protected idpMenuItemSelected = (index: number)=> {
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
		event   : React.MouseEvent<HTMLElement>
	): void => {
		log.debug("userIdentsMenuButtonClicked()");

		const str = event.currentTarget.dataset.mode!;

		let options: UserIdentsMenuButtonClickedOptions|null = null;
		try {
			options = JSON.parse(str);
		} catch(e) {
			log.err("Error parsing dataset.mode: "+ e);
		}
		
		if (options)
		{
			this.setState({
				userIdentsMenuAnchor        : event.currentTarget,
				userIdentsMenuOpen          : options.userID,
				userIdentsMenuSourceIndex   : options.sourceIdx,
				userIdentsMenuSelectedIndex : options.selectedIdx,
			});
		}
	}

	protected userIdentsMenuItemSelected = (index: number)=> {
		log.debug(`userIdentsMenuItemSelected(${index})`);

		// Todo...

		this.setState({
			userIdentsMenuAnchor        : null,
			userIdentsMenuOpen          : null,
			userIdentsMenuSourceIndex   : 0,
			userIdentsMenuSelectedIndex : 0,
		});
	}

	protected userIdentsMenuClosed = ()=> {
		log.debug("userIdentsMenuClosed()");

		this.setState({
			userIdentsMenuAnchor        : null,
			userIdentsMenuOpen          : null,
			userIdentsMenuSourceIndex   : 0,
			userIdentsMenuSelectedIndex : 0,
		});
	}

	protected searchTextFieldChanged = (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
	) => {
		const newValue = event.target.value;
		log.debug("searchTextFieldChanged() => "+ newValue);

		this.setState({
			searchTextFieldStr: newValue
		});
	}

	protected searchTextFieldKeyPress = (
		event: React.KeyboardEvent<HTMLDivElement>
	) => {
		if (event.key === 'Enter')
		{
			this.submitSearch();
		}
	}

	protected submitSearch = (page ?: number)=> {
		log.debug("submitSearch(): "+ this.state.searchTextFieldStr);

		page = page || 0;

		const state = this.state;
		const searchQueryIndex = state.searchQueryIndex + 1;

		let search_provider: string = "*"
		if (state.idpMenuSelectedIndex >= 0) {
			search_provider = state.identityProviders[state.idpMenuSelectedIndex].id;
		}

		const search_query = state.searchTextFieldStr.trim();

		const emptySearchResults: SearchResults = {
			provider : search_provider,
			query    : search_query,
			mode     : "boolean",
			limit    : state.searchResultsPerPage,
			offset   : (state.searchResultsPerPage * page),
			results  : [],
			matches  : []
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

		const host = apigateway.getHost();
		const path = apigateway.getPath("/auth0/search");

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

				// Now we need to calculate various information about how each search result
				// matches the query.
				// 
				const matches: SearchMatchInfo[] = [];

				for (const searchResult of searchResults.results)
				{
					const match = this.matchInfoForSearchResult(search_query, searchResult);
					matches.push(match);
				}

				searchResults.matches = matches;
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
			});
		});
	}

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

	protected matchInfoForSearchResult = (
		query        : string,
		searchResult : SearchResult
	): SearchMatchInfo =>
	{
		const queryComponents = query.split(' ').filter((str)=> {
			return str.length > 0;
		}).map((str)=> {
			return str.toLowerCase();
		});

		log.debug('queryComponents: '+ queryComponents);

		const matchInfos: SearchMatchInfo[] = [];

		searchResult.auth0.identities.forEach((identity, idx) => {

			const matchInfo: SearchMatchInfo = {
				identityIdx : idx,
				displayName : this.displayNameForIdentity(searchResult, identity),
				boldRanges  : [],
				points      : 0
			};

			const displayName_lowerCase = matchInfo.displayName.toLowerCase();

			for (const queryComponent of queryComponents)
			{
				const matchIndex = displayName_lowerCase.indexOf(queryComponent);
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

			const imgUrl = this.imageUrlForIdentity(searchResult, identity);
			if (imgUrl != null) {
				matchInfo.points++;
			}

			matchInfos.push(matchInfo);
		});

		matchInfos.sort((a, b)=> {

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

			const a_identity = searchResult.auth0.identities[a.identityIdx];
			const b_identity = searchResult.auth0.identities[b.identityIdx];

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

		const result = matchInfos[0];

		// We have one last thing to do.
		// The queryComponents may be: [
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
		// So we want to merge all the ranges.
		// 
		if (result.boldRanges.length > 0)
		{
			const stack: StringRange[] = [];

			result.boldRanges.sort((a, b)=> {
				return a.indexStart - b.indexStart;
			});

			stack.push(result.boldRanges[0]);

			result.boldRanges.slice(1).forEach((range, i)=> {

				const top = stack[stack.length - 1];
		  
				if (top.indexEnd < range.indexStart) {
		  
					// No overlap, push range onto stack
					stack.push(range);

				} else if (top.indexEnd < range.indexEnd) {
		  
					// Update previous range
					top.indexEnd = range.indexEnd;
				}
			});

			result.boldRanges = stack;
		}

		return result;
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

	protected displayNameForIdentity = (
		searchResult : SearchResult,
		identity     : Auth0Identity
	): string =>
	{
		let displayName: string|null = null;

		switch (identity.provider)
		{
			case "auth0":
			case "evernote":
			case "evernote-sandbox": {
				// Auth0 database connections use the term 'username'.
				// Evernote uses the term 'username'
				displayName = identity.profileData.username;
				break;
			}
			case "wordpress": {
				// wordpress uses the term 'display_name'
				displayName = identity.profileData.display_name;
				break;
			}
			default: {
				displayName = identity.profileData.name;
				break;
			}
		}
		
		if (!_.isString(displayName)) {
			displayName = searchResult.s4.user_id;
		}

		return displayName;
	}

	protected imageUrlForIdentity = (
		searchResult : SearchResult,
		identity     : Auth0Identity
	): string|null =>
	{
		

		let url: string|null = null;

		if (identity.provider == "auth0")
		{
			const region = searchResult.s4.region;
			const bucket = searchResult.s4.bucket;

			const components = identity.user_id.split('|');
			const auth0_id = components[components.length - 1];

			// Example:
			// https://s3-us-west-2.amazonaws.com/com.4th-a.user.jag15iacxneuco7owmegke63msbgyuyx-35e540bc/avatar/5a983d0232a70c286d7c1931

			url = `https://s3-${region}.amazonaws.com/${bucket}/avatar/${auth0_id}`;
		}
		else
		{
			const profileData = identity.profileData || {};
			const picUrl = profileData.picture;

			if (_.isString(picUrl))
			{
				url = picUrl;

				let test: URL|null = null;
				try {
					test = new URL(url);
				} catch(e){}

				if (test && test.host.includes("gravatar.com"))
				{
					if (url.includes("cdn.auth0.com/avatars"))
					{
						// Filter out the default auth0 picture.
						// We can use our own SVG generated icon.

						url = null;
					}
				}

				if (url && identity.provider == "bitbucket")
				{
					url = url.replace("/32/", "/128/");
				}
			}
		}

		return url;
	}

	protected renderSearchFields() {
		const state = this.state;
		const {classes} = this.props;

		let providerName: string;
		if (state.idpMenuSelectedIndex >= 0)
		{
			const idp = state.identityProviders[state.idpMenuSelectedIndex];
			providerName = idp.displayName;
		}
		else
		{
			providerName = "All Providers"
		}

		let progressSection;
		if (state.searchQueryIndex > state.searchResultsIndex)
		{
			progressSection = (
				<CircularProgress className={classes.progress} color="secondary" size={16} />
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
				/>
				<Button variant="outlined" onClick={this.idpMenuButtonClicked}>
					{providerName}
				</Button>
				<Menu
					id="lock-menu"
					anchorEl={state.idpMenuButtonAnchor}
					open={state.idpMenuOpen}
					onClose={this.idpMenuClosed}
					PaperProps={{
						style: {
							minHeight: 40,
							maxHeight: 415
						}
					}}
				>
					<MenuItem
						key="-all-"
						selected={state.idpMenuSelectedIndex < 0}
						onClick={this.idpMenuItemSelected.bind(this, -1)}
					>
						All Providers
					</MenuItem>
					{state.identityProviders.map((idp, index) => {
						const onClick = this.idpMenuItemSelected.bind(this, index);
						return (
							<MenuItem
								key={idp.id}
								selected={state.idpMenuSelectedIndex == index}
								onClick={onClick}
							>
								<ListItemIcon className={classes.icon}>
							 		<img src={this.urlForIdentityProvider_64(idp)} width="32" height="32" />
								</ListItemIcon>
								<ListItemText
									classes={{ primary: classes.primary }}
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

	public renderSearchResultsTable() {
		const state = this.state;
		const {classes} = this.props;

		const searchResults = state.searchResults;
		if (searchResults == null) {
			return null;
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

							const match = searchResults.matches[searchResultIdx];
							const identity = identities[match.identityIdx];
							
							const displayName = match.displayName;

							const idpUrl = this.urlForIdentityProvier_signin(identity);
							const avatarUrl = this.imageUrlForIdentity(searchResult, identity);

							const avatarSection = (
								<Avatar className={classes.avatar}>
									<ReactImageFallback
										src={avatarUrl || undefined}
										initialImage={
											<AccountCircleIcon className={classes.avatar} color="primary"/>
										}
										fallbackImage={
											<AccountCircleIcon className={classes.avatar} color="primary"/>
										}
										width={64} height={64} />
								</Avatar>
								
							);
							
							let displayNameSection;
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

										const hasPrefix = range.indexStart > lastIndex;
										const hasSuffix =
										(range.indexEnd < displayName.length) &&
										(rangeIdx == match.boldRanges.length - 1);

										if (hasPrefix && hasSuffix)
										{
											const a = displayName.substring(lastIndex, range.indexStart);
											const b = displayName.substring(range.indexStart, range.indexEnd);
											const c = displayName.substring(range.indexEnd);

											return (
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

											return (
												<React.Fragment key={`fragment_${rangeIdx}`}>
													<span key={`a_${rangeIdx}`}>{a}</span>
													<span key={`b_${rangeIdx}`} className={classes.spanBold}>{b}</span>
												</React.Fragment>
											);
										}
										else if (hasSuffix)
										{
											const b = displayName.substring(range.indexStart, range.indexEnd);
											const c = displayName.substring(range.indexEnd);

											return (
												<React.Fragment key={`fragment_${rangeIdx}`}>
													<span key={`b_${rangeIdx}`} className={classes.spanBold}>{b}</span>
													<span key={`c_${rangeIdx}`}>{c}</span>
												</React.Fragment>
											);
										}
										else
										{
											const b = displayName.substring(range.indexStart, range.indexEnd);

											return (
												<span className={classes.spanBold}>{b}</span>
											);
										}

										lastIndex = range.indexEnd;
									})}
									</React.Fragment>
								);
							}

							const onClickOptions_obj : UserIdentsMenuButtonClickedOptions = {
								userID      : user_id,
								sourceIdx   : searchResultIdx,
								selectedIdx : match.identityIdx
							};
							const onClickOptions_str = JSON.stringify(onClickOptions_obj, null, 0);
							
							return (
								<TableRow key={searchResult.s4.user_id}>
									<TableCell>
										<div className={classes.tableRow_container}>
											<div className={classes.tableRow_avatar}>
												{avatarSection}
											</div>
											<div className={classes.tableRow_nameAndProvider}>
												<Typography variant="headline">{displayNameSection}</Typography>
												<img src={idpUrl} height="22" className={classes.signInImg}/>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<IconButton
											onClick={this.userIdentsMenuButtonClicked}
											data-mode={onClickOptions_str}
										>
										<Badge badgeContent={identities.length} color="primary">
												<AccountCircleIcon />
											</Badge>
										</IconButton>
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

					log.debug(`userIdentsMenuOpen(${state.userIdentsMenuOpen}) ?== user_id(${user_id})`);

					return (
						<Menu
							key={user_id}
							anchorEl={state.userIdentsMenuAnchor}
							open={state.userIdentsMenuOpen == user_id}
							onClose={this.userIdentsMenuClosed}
						>
						{searchResult.auth0.identities.map((identity, identityIdx)=> {

							const idpUrl = this.urlForIdentityProvider_64(identity);
							const displayName = this.displayNameForIdentity(searchResult, identity);
							
							return (
								<MenuItem
									key={`${user_id}|${identity.user_id}`}
									selected={state.userIdentsMenuSelectedIndex == identityIdx}
								>
									<ListItemIcon className={classes.icon}>
										 <img src={idpUrl} width="32" height="32" />
									</ListItemIcon>
									<ListItemText
										classes={{ primary: classes.primary }}
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

	public render() {
		const state = this.state;
		const {classes} = this.props;

		let providerName: string;
		if (state.idpMenuSelectedIndex >= 0)
		{
			const idp = state.identityProviders[state.idpMenuSelectedIndex];
			providerName = idp.displayName;
		}
		else
		{
			providerName = "All Providers"
		}

		const searchFieldsSection = this.renderSearchFields();
		const searchResultsTableSection = this.renderSearchResultsTable();

		return (
			<div className={classes.root}>
				<div className={classes.section_explanation}>
					<Typography variant="display2" >
						Send Files Securely
					</Typography><br/>
					<Typography variant="subheading">
						Send files to any Storm4 user.<br/>
						Files are encrypted in your browser before uploading.<br/>
						Storm4 users have their public keys secured on the blockchain.<br/>
					</Typography>
				</div>
				<Divider/>
				{searchFieldsSection}
				{searchResultsTableSection}
			</div>
		);
	}

	public componentDidMount() {
		log.debug("componentDidMount()");

		this.fetchIdentityProviders();
	}
}

export default withStyles(styles)(withRouter(Search));
