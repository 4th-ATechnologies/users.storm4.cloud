import * as React from 'react';
import {isArray, isString}  from 'lodash';
import {RouteComponentProps} from 'react-router';
import {withRouter} from 'react-router-dom'

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

const log = Logger.Make('warn', 'Search');

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

interface ISearchProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
}

interface ISearchState {
	isFetchingIdentityProviders : boolean
	identityProviders           : IdentityProvider[]
	idpSelectedIndex            : number,
	idpButtonAnchor             : HTMLElement|null,
	idpMenuOpen                 : boolean
}

class Search extends React.Component<ISearchProps, ISearchState> {

	public state: ISearchState = {
		isFetchingIdentityProviders : false,
		identityProviders           : [],
		idpSelectedIndex            : -1,
		idpButtonAnchor             : null,
		idpMenuOpen                 : false
	};

	private urlForIdentityProvider = (idp: IdentityProvider)=> {

		return `https://s3-us-west-2.amazonaws.com/com.4th-a.resources/socialmediaicons/64x64/${idp.id}.png`;
	}

	private fetchIdentityProviders = ()=> {

		const url = 'https://s3-us-west-2.amazonaws.com/com.4th-a.resources/socialmediaproviders.json';
		fetch(url).then((response)=>{

			 return response.json();

		}).then((json: any)=>{

			const updatedState: Partial<ISearchState> = {
				isFetchingIdentityProviders: false
			};

			let idp: IdentityProvider[]|null = null;
			if (isArray(json))
			{
				let isValid = true;
				for (const obj of json)
				{
					if (!isString(obj.id) || !isString(obj.displayName)) {
						isValid = false;
					}
				}

				if (isValid)
				{
					idp = json as IdentityProvider[];
					idp.sort((a, b)=>{
						return a.displayName.localeCompare(b.displayName);
					});

					updatedState.identityProviders = idp;
				}
			}

			this.setState(updatedState as any);

		}).catch((err)=>{

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
						<li>Files are encrypted in your browser being uploading</li>
						<li>Storm4 users have their public keys secured on the blockchain</li>
					</ul>
				</Typography>
				<TextField
					id="search"
					label="Search for user"
					type="search"
					className={classes.searchTextField}
					margin="normal"
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
								{idp.displayName}
								<ListItemIcon className={classes.icon}>
							 		<DraftsIcon />
								</ListItemIcon>
								<ListItemText classes={{ primary: classes.primary }} inset primary="Drafts" />
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
