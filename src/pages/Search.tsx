import * as React from 'react';
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

import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography';

import DraftsIcon from '@material-ui/icons/Drafts';

const log = Logger.Make('debug', 'Search');

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
	},
	searchTextField: {
		width: 225,
		marginRight: 12
	}
});

interface IdentityProvider {
	id          : string,
	displayName : string,
	type        : number,
	eTag_64x64  : string,
	eTag_signin : string
}

export interface Auth0Identity {
	user_id     : string,
	provider    : string,
	connection  : string,
	profileData : any
}

interface SearchResult {
	s4 : {
		user_id : string,
		bucket  : string,
		region  : string
	},
	auth0: {
		updated_at : string,
		user_metadata : {
			preferedAuth0ID ?: string
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
	results  : SearchResult[]
}

interface ISearchProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
}

interface ISearchState {
	isFetchingIdentityProviders : boolean,
	identityProviders           : IdentityProvider[]
	idpSelectedIndex            : number,
	idpButtonAnchor             : HTMLElement|null,
	idpMenuOpen                 : boolean,
	searchTextFieldStr          : string,
	searchResults               : SearchResults|null
}

class Search extends React.Component<ISearchProps, ISearchState> {

	public state: ISearchState = {
		isFetchingIdentityProviders : false,
		identityProviders           : [],
		idpSelectedIndex            : -1,
		idpButtonAnchor             : null,
		idpMenuOpen                 : false,
		searchTextFieldStr          : '',
		searchResults               : null
	};

	private urlForIdentityProvider = (idp: IdentityProvider)=> {

		return `https://s3-us-west-2.amazonaws.com/com.4th-a.resources/socialmediaicons/64x64/${idp.id}.png`;
	}

	private fetchIdentityProviders = ()=> {
		log.debug("fetchIdentityProviders()");

		this.setState({
			isFetchingIdentityProviders: true
		});

		const url = 'https://pzg66sum7l.execute-api.us-west-2.amazonaws.com/dev/config';
		fetch(url).then((response)=> {

			 return response.json();

		}).then((json: any)=>{

			log.debug("json: "+ JSON.stringify(json, null, 2));

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

	protected identityProvidersButtonClicked = (event: React.MouseEvent<HTMLElement>)=> {
		log.debug('identityProvidersButtonClicked()');

		this.setState({
			idpButtonAnchor : event.currentTarget,
			idpMenuOpen     : true
		});
	}

	protected identityProviderSelected = (index: number)=> {
		log.debug(`identityProvidersMenuClosed(${index})`);

		this.setState({
			idpSelectedIndex : index,
			idpButtonAnchor  : null,
			idpMenuOpen      : false
		});
	}

	protected identityProvidersMenuClosed = ()=> {
		log.debug('identityProvidersMenuClosed()');

		this.setState({
			idpButtonAnchor : null,
			idpMenuOpen     : false
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

	protected submitSearch = ()=> {
		log.debug("submitSearch(): "+ this.state.searchTextFieldStr);

		const state = this.state;

		let search_provider: string = "*"
		if (state.idpSelectedIndex >= 0) {
			search_provider = state.identityProviders[state.idpSelectedIndex].id;
		}

		const search_query = state.searchTextFieldStr.trim();

		const emptySearchResults: SearchResults = {
			provider : search_provider,
			query    : search_query,
			mode     : "boolean",
			limit    : 100,
			offset   : 0,
			results  : []
		};

		if (search_query.length == 0)
		{
			this.setState({
				searchResults: emptySearchResults
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

		fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body, null, 0)

		}).then((response)=> {

			return response.json();
		
		}).then((json)=> {

			log.debug("search results: "+ JSON.stringify(json, null, 2));

		}).catch(()=> {

			this.setState({
				searchResults: emptySearchResults
			});
		});
	}

	public render() {
		const state = this.state;
		const {classes} = this.props;

		let providerName: string;
		if (state.idpSelectedIndex >= 0)
		{
			const idp = state.identityProviders[state.idpSelectedIndex];
			providerName = idp.displayName;
		}
		else
		{
			providerName = "All Providers"
		}

		return (
			<div className={classes.root}>
				<Typography variant="display2" >
					Securely send files
				</Typography><br/>
				<Typography variant="subheading">
					<ul>
						<li>Send files to any Storm4 user</li>
						<li>Files are encrypted in your browser uploading</li>
						<li>Storm4 users have their public keys secured on the blockchain</li>
					</ul>
				</Typography>
				<TextField
					id="searchTextField"
					label="Search for user"
					type="search"
					className={classes.searchTextField}
					margin="normal"
					onChange={this.searchTextFieldChanged}
					onKeyPress={this.searchTextFieldKeyPress}
				/>
				<Button variant="outlined" onClick={this.identityProvidersButtonClicked}>
					{providerName}
				</Button>
				<Menu
					id="lock-menu"
					anchorEl={state.idpButtonAnchor}
					open={state.idpMenuOpen}
					onClose={this.identityProvidersMenuClosed}
					PaperProps={{
						style: {
							minHeight: 40,
							maxHeight: 415
						}
					}}
				>
					<MenuItem
						key="-all-"
						selected={state.idpSelectedIndex < 0}
						onClick={this.identityProviderSelected.bind(this, -1)}
					>
						All Providers
					</MenuItem>
					{state.identityProviders.map((idp, index) => {
						const onClick = this.identityProviderSelected.bind(this, index);
						return (
							<MenuItem
								key={idp.id}
								selected={state.idpSelectedIndex == index}
								onClick={onClick}
							>
								<ListItemIcon className={classes.icon}>
							 		<img src={this.urlForIdentityProvider(idp)} width="32" height="32" />
								</ListItemIcon>
								<ListItemText classes={{ primary: classes.primary }} inset={true} primary={idp.displayName} />
							</MenuItem>
						);
					})}
				</Menu>
			</div>
		);
	}

	public componentDidMount() {
		log.debug("componentDidMount()");

		this.fetchIdentityProviders();
	}
}

export default withStyles(styles)(withRouter(Search));
