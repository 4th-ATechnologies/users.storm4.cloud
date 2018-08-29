import * as React from 'react';
import * as _ from 'lodash';
import * as merkle_tree_gen from 'merkle-tree-gen';
import * as queryString from 'query-string';

import ReactImageFallback from 'react-image-fallback';

import {RouteComponentProps} from 'react-router';
import {withRouter} from 'react-router-dom'

import * as util from '../util/Util';
import * as users_cache from '../util/UsersCache';

import {Logger} from '../util/Logging'

import {
	UserInfo,
	Auth0Identity,
	Auth0Profile,
	UserProfile,
	PubKey,
	MerkleTreeFile,
	MerkleTreeFileValue,
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
import CircularProgress from '@material-ui/core/CircularProgress';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import IconButton from '@material-ui/core/IconButton';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ReportProblemIcon from '@material-ui/icons/ReportProblem';


const log = Logger.Make('debug', 'Send');

const AVATAR_SIZE = 96;

const HASH_TYPE_ID = "0"; // result for hashTypeID("sha256")

const styles: StyleRulesCallback = (theme: Theme) => createStyles({
	root: {
		display: 'flex',
		flexDirection: 'column',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
		margin: 0,
		padding: 0
	},
	section_identity: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
		maxWidth: 400,
		margin: 0,
		paddingTop: 0,
		paddingBottom: 0,
		paddingLeft: theme.spacing.unit,
		paddingRight: theme.spacing.unit,
	//	backgroundColor: 'pink'
	},
	section_identity_avatar: {
		flexBasis: 'auto',
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		boxShadow: '#C1C1C1 0px 0px 2px'
	},
	section_identity_avatar_img: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE
	},
	section_identity_fetching: {
		flexBasis: 'auto',
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
		marginLeft: theme.spacing.unit * 2,
	},
	section_identity_fetching_progress: {
		marginRight: theme.spacing.unit * 2
	},
	section_identity_nameAndProvider: {
		flexBasis: 'auto',
		marginLeft: theme.spacing.unit * 2,
		marginRight: theme.spacing.unit * 2
	},
	section_identity_name: {
		marginBottom: theme.spacing.unit
	},
	identityProviderImg: {
		backgroundColor: 'rgb(255,255,255)',
		paddingLeft: 6,
		paddingRight: 6,
		paddingTop: 3,
		paddingBottom: 3,
		borderRadius: 3
	},
	section_expansionPanels: {
		marginTop: theme.spacing.unit * 2,
		maxWidth: 600,
	},
	section_expansionPanel_summary: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: 'center',
		alignItems: 'center',
		alignContent: 'center',
	},
	section_expansionPanel_summary_text: {
		marginLeft: theme.spacing.unit * 2
	},
	section_expansionPanel_details: {
	},
	span_underline: {
		textDecoration: 'underline'
	},
	a_noLinkColor: {
		color: 'inherit'
	},
	indented: {
		marginLeft: theme.spacing.unit * 2
	},
	wrap: {
		wordWrap: 'break-word',
		wordBreak: 'break-all'
	},
	gray: {
		color: theme.palette.text.secondary
	},
	blockquote: {
		marginLeft  : theme.spacing.unit * 2,
		fontFamily  : 'Consolas, "Times New Roman", Verdana',
		borderLeft  : '2px solid #CCC',
		paddingLeft : '8px'
	},
	sub_ul: {
		wordWrap: 'break-word',
		wordBreak: 'break-all',
		marginLeft: theme.spacing.unit * 2,
		paddingLeft: 0,
	},
	sub_ul_li: {
		wordWrap: 'break-word',
		wordBreak: 'break-all',
		paddingLeft: 0,
		marginLeft: 0
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
});

interface ISendProps extends RouteComponentProps<any>, WithStyles<typeof styles> {
	user_id     : string,
	identityID ?: string
}

interface ISendState {

	// User profile (region, bucket & auth0 identities)
	// 
	is_fetching_user_profile : boolean,
	user_profile              : UserProfile|null,
	user_profile_identity_idx : number|null,
	user_profile_err_msg      : string|null,

	// Public key
	// 
	is_fetching_public_key : boolean,
	public_key             : PubKey|null,
	public_key_err_msg     : string|null,

	// Blockchain info
	//
	is_fetching_merkle_tree_root : boolean,
	merkle_tree_root             : string|null,
	merkle_tree_root_err_msg     : string|null

	is_fetching_merkle_tree_file : boolean,
	merkle_tree_file             : MerkleTreeFile|null,
	merkle_tree_file_err_msg     : string|null,

	// PubKey Verification
	// 
	is_verifying_public_key     : boolean,
	pubkey_verifcation_success  : boolean|null,
	pubkey_verification_err_msg : string|null,
	pubkey_tampering_detected   : boolean|null,
	calculated_merkle_tree_root : string|null

	// User identity menu
	//
	userIdentsMenuAnchor : HTMLElement|null,
	userIdentsMenuOpen   : boolean,
}

class Send extends React.Component<ISendProps, ISendState> {

	public state: ISendState = {
		is_fetching_user_profile  : false,
		user_profile              : null,
		user_profile_identity_idx : null,
		user_profile_err_msg      : null,

		is_fetching_public_key : false,
		public_key             : null,
		public_key_err_msg     : null,

		is_fetching_merkle_tree_root : false,
		merkle_tree_root             : null,
		merkle_tree_root_err_msg     : null,

		is_fetching_merkle_tree_file : false,
		merkle_tree_file             : null,
		merkle_tree_file_err_msg     : null,

		is_verifying_public_key     : false,
		pubkey_verifcation_success  : null,
		pubkey_verification_err_msg : null,
		pubkey_tampering_detected   : null,
		calculated_merkle_tree_root : null,

		userIdentsMenuAnchor : null,
		userIdentsMenuOpen   : false
	}

	protected getIdentityIdx = (): number => {

		const user_profile = this.state.user_profile;
		if (user_profile == null) {
			return 0;
		}

		const manually_selected_idx = this.state.user_profile_identity_idx;
		if (_.isNumber(manually_selected_idx)) {
			return manually_selected_idx;
		}
		
		// - this.props.identityID:
		// 	This is the ID that was displayed via the search results.
		//    We use it to maintain a consistent experience.
		// 
		// - user_profile.auth0.user_metadata.preferedAuth0ID
		// 	This is what the user has selected as their default identity.

		const search_id =
			this.props.identityID ||
			user_profile.auth0.user_metadata.preferedAuth0ID ||
			user_profile.auth0.user_metadata.preferredAuth0ID;

		if (search_id)
		{
			let identityIdx = 0;
			for (const identity of user_profile.auth0.identities)
			{
				const identityID = `${identity.provider}|${identity.user_id}`;
				if (identityID == search_id)
				{
					return identityIdx;
				}

				identityIdx++;
			}
		}

		return 0;
	}

	protected fetchUserProfile = ()=> {
		log.debug("fetchUserProfile()");

		users_cache.fetchUserProfile(this.props.user_id, (err, status_code, user_profile)=> {

			log.debug("fetchUserProfile: err: "+ err);
			log.debug("fetchUserProfile: status_code: "+ status_code);
			log.debug("fetchUserProfile: user_profile: "+ JSON.stringify(user_profile, null, 2));

			let err_msg: string|null = null;
			if (err)
			{
				err_msg = "Unable to fetch user. Check internet connection.";
			}
			else if (status_code != 200 || user_profile == null)
			{
				err_msg = (status_code == 404)
				  ? "User not found. The userID may be incorrect, or the user may have deleted their account."
				  : "User not found. The server may be experiencing technical difficulties."
			}
			else if (user_profile.s4.deleted)
			{
				err_msg = "User account has been deleted."
			}

			if (err_msg)
			{
				this.setState({
					is_fetching_user_profile : false,
					user_profile_err_msg     : err_msg
				});
				return;
			}
			else
			{
				user_profile = user_profile!;

				let selected_idx: number|null = null;

				const qp = queryString.parse(this.props.location.search);
				const idh = qp.idh;
				if (idh)
				{
					selected_idx = util.findSelectedIdentity({
						identities : user_profile.auth0.identities,
						idh        : idh
					});
				}

				this.setState({
					is_fetching_user_profile  : false,
					user_profile              : user_profile,
					user_profile_identity_idx : selected_idx

				}, ()=> {

					this.fetchPublicKey();
					this.fetchBlockchainInfo();
				});
			}
		});
	}

	public fetchPublicKey = ()=> {
		log.debug("fetchPublicKey()");

		const user_profile = this.state.user_profile;
		if (user_profile == null) {
			return;
		}

		this.setState({
			is_fetching_public_key : true
		});

		const url = util.pubKeyUrlForUser(user_profile.s4);

		fetch(url, {
			method: 'GET'

		}).then((response)=> {

			if (response.status != 200)
			{
				log.err("Error fetching pubKey: "+ response.status);

				const err_msg = "User's public key not found!";
				this.setState({
					is_fetching_public_key     : false,
					public_key_err_msg         : err_msg,
					pubkey_verifcation_success : false
				});
				return;
			}

			return response.json();

		}).then((json)=> {

			log.debug("pubKey JSON: "+ JSON.stringify(json, null, 2));

			this.setState({
				is_fetching_public_key : false,
				public_key             : json
			});

		}).catch((reason)=> {

			log.err("Error fetching pubKey: "+ reason);

			const err_msg = "User's public key not found! Check internet connection.";
			this.setState({
				is_fetching_public_key     : false,
				public_key_err_msg         : err_msg,
				pubkey_verifcation_success : false
			});
		});
	}

	public fetchBlockchainInfo = (): void => {
		log.debug("fetchBlockchainInfo()");

		const user_profile = this.state.user_profile;
		if (user_profile == null) {
			return;
		}

		this.setState({
			is_fetching_merkle_tree_root : true
		});

		const url = util.rpcURL();
		const body_obj = util.rpcJSON(user_profile.s4.user_id);

		log.debug(`POST: ${url}: ${JSON.stringify(body_obj, null, 2)}`);

		fetch(url, {
			method : 'POST',
			body   : JSON.stringify(body_obj, null, 0)

		}).then((response)=> {

			if (response.status != 200)
			{
				log.err("Error fetching blockchainInfo: "+ response.status);

				const err_msg = "Could not fetch blockchain info. Ethereum node is having technical difficulties?.";
				this.setState({
					is_fetching_merkle_tree_root : false,
					merkle_tree_root_err_msg     : err_msg,
					pubkey_verifcation_success   : false
				});
				return;
			}

			return response.json();

		}).then((json)=> {

			log.debug("RPC JSON response: "+ JSON.stringify(json, null, 2));

			const merkle_tree_root = util.extractMerkleTreeRoot(json);
			log.debug("merkle_tree_root: "+ merkle_tree_root);

			if (merkle_tree_root.length == 0)
			{
				this.setState({
					is_fetching_merkle_tree_root : false,
					merkle_tree_root             : merkle_tree_root,
					pubkey_verifcation_success   : false
				});
			}
			else
			{
				this.setState({
					is_fetching_merkle_tree_root : false,
					is_fetching_merkle_tree_file : true,
					merkle_tree_root             : merkle_tree_root

				}, ()=> {

					this.fetchMerkleTree();
				});
			}

		}).catch((reason)=> {

			log.err("Error fetching blockchainInfo: "+ reason);

			const err_msg = "Could not fetch blockchain info! Check internet connection.";
			this.setState({
				is_fetching_merkle_tree_root : false,
				merkle_tree_root_err_msg     : err_msg,
				pubkey_verifcation_success   : false
			});
		});
	}

	public fetchMerkleTree = (): void => {
		log.debug("fetchMerkleTree()");

		const merkle_tree_root = this.state.merkle_tree_root;
		if (merkle_tree_root == null || merkle_tree_root.length == 0) {
			return;
		}

		this.setState({
			is_fetching_merkle_tree_file : true
		});

		const url = util.merkleTreeFileURL(merkle_tree_root);

		fetch(url, {
			method: 'GET'

		}).then((response)=> {

			if (response.status != 200)
			{
				log.err("Error fetching merkle tree: "+ response.status);

				const err_msg = "Could not fetch merkle tree. We may be experiencing technical difficulties.";
				this.setState({
					is_fetching_merkle_tree_file : false,
					merkle_tree_file_err_msg     : err_msg,
					pubkey_verifcation_success   : false
				});
				return;
			}

			return response.json();

		}).then((json)=> {

			log.debug("merkleTree JSON: "+ JSON.stringify(json, null, 2));

			this.setState({
				is_fetching_merkle_tree_file : false,
				is_verifying_public_key      : true,
				merkle_tree_file             : json

			}, ()=> {

				this.verifyPublicKey();
			});

		}).catch((reason)=> {

			log.err("Error fetching merkleTree: "+ reason);

			const err_msg = "Could not fetch merkle tree! Check internet connection.";
			this.setState({
				is_fetching_merkle_tree_file : false,
				merkle_tree_file_err_msg     : err_msg,
				pubkey_verifcation_success   : false
			});
		});
	}

	protected verifyPublicKey = (): void => {
		log.debug("verifyPublicKey()");

		const merkle_tree_file = this.state.merkle_tree_file;
		if (merkle_tree_file == null) {
			return;
		}

		merkle_tree_gen.fromArray({
			array: merkle_tree_file.values
		
		}, (err, tree)=> {

			if (err || tree == null)
			{
				log.debug("merkle_tree_gen: err: "+ err);

				this.setState({
					is_verifying_public_key     : false,
					pubkey_verifcation_success  : false,
					pubkey_verification_err_msg : "Error performing crypto in browser. Is this an outdated browser?"
				});
				return;
			}

			log.debug("merkle_tree_gen: tree: "+ JSON.stringify(tree, null, 2));

			// Checks to perform:
			// - The merkle tree file contains an entry for our userID
			// - The merkle tree entry matches the public key info we fetched
			// - The merkle tree root matches our own calculations

			const _gotoErr = (msg: string): void => {
				this.setState({
					is_verifying_public_key     : false,
					pubkey_verifcation_success  : false,
					pubkey_verification_err_msg : msg,
					pubkey_tampering_detected   : true,
					calculated_merkle_tree_root : tree.root
				});
			}

			const user_profile = this.state.user_profile;
			const user_id = user_profile ? user_profile.s4.user_id : "";

			const pubkey = this.state.public_key!;

			const values_idx = merkle_tree_file.lookup[user_id];
			if (values_idx == null || values_idx < 0 || values_idx >= merkle_tree_file.values.length)
			{
				_gotoErr("UserID not found in merkle tree file !");
				return;
			}

			const value_json_str = merkle_tree_file.values[values_idx];
			let value: MerkleTreeFileValue|null = null;
			try {
				value = JSON.parse(value_json_str);
			} catch (e) {
				log.err("Error parsing merkle_tree_file.value[]: "+ e);
			}

			if (value == null             ||
				 !_.isObject(value)        ||
				 !_.isString(value.userID) ||
			    !_.isString(value.pubKey) ||
				 !_.isString(value.keyID))
			{
				_gotoErr("User's public key not found in merkle tree file !");
				return;
			}

			if (value.userID != user_id       ||
				 value.pubKey != pubkey.pubKey ||
			    value.keyID  != pubkey.keyID   )
			{
				_gotoErr("Public key information doesn't match value in merkle tree file !");
				return;
			}

			if (tree.root != merkle_tree_file.merkle.root)
			{
				_gotoErr("Merkle tree root mismatch !");
				return;
			}

			this.setState({
				is_verifying_public_key     : false,
				pubkey_verifcation_success  : true,
				pubkey_verification_err_msg : null,
				pubkey_tampering_detected   : false,
				calculated_merkle_tree_root : tree.root
			});
		});
	}

	protected userIdentsMenuButtonClicked = (
		event   : React.MouseEvent<HTMLElement>
	): void => {
		log.debug("userIdentsMenuButtonClicked()");
		
		this.setState({
			userIdentsMenuAnchor : event.currentTarget,
			userIdentsMenuOpen   : true
		});
	}

	protected userIdentsMenuItemSelected = (
		index : number,
		event : React.MouseEvent<HTMLElement>
	): void =>
	{
		log.debug(`userIdentsMenuItemSelected(${index})`);

		let idh: string|null = null;

		const user_profile = this.state.user_profile;
		if (user_profile)
		{
			const identities = user_profile.auth0.identities;
			if (index >= 0 && index < identities.length)
			{
				const identity = identities[index];
				idh = util.idhForIdentity(identity)
			}
		}

		this.setState({
			user_profile_identity_idx : index,
			userIdentsMenuAnchor      : null,
			userIdentsMenuOpen        : false

		}, ()=> {

			if (idh)
			{
				const user_id = user_profile!.s4.user_id;
				const url = `/id/${user_id}?idh=${idh}`

				this.props.history.replace(url);
			}
		});
	}

	protected userIdentsMenuClosed = ()=> {
		log.debug("userIdentsMenuClosed()");

		this.setState({
			userIdentsMenuAnchor : null,
			userIdentsMenuOpen   : false
		});
	}

	public renderUserProfile(): React.ReactNode|React.ReactFragment {
		const state = this.state;
		const {classes} = this.props;

		if (state.is_fetching_user_profile)
		{
			return (
				<div className={classes.section_identity}>
					<Avatar className={classes.section_identity_avatar}>
						<AccountCircleIcon className={classes.section_identity_avatar_img}/>
					</Avatar>
					<div className={classes.section_identity_fetching}>
						<CircularProgress
							className={classes.section_identity_fetching_progress}
							color="primary"
							size={16}
						/>
						<Typography variant="headline">
							{'Fetching user...'}
						</Typography>
					</div>
				</div>
			);
		}
		else if (state.user_profile_err_msg)
		{
			return (
				<div className={classes.section_identity}>
					<Typography variant="headline">
						{state.user_profile_err_msg}
					</Typography>
				</div>
			);
		}
		else if (state.user_profile)
		{
			const user_profile = state.user_profile;
			const identities = user_profile.auth0.identities;

			const selected_identityIdx = this.getIdentityIdx();
			const selected_identity = identities[selected_identityIdx];

			const selected_idpUrl = util.imageUrlForIdentityProvider_signin(selected_identity);
			const selected_idUrl = util.imageUrlForIdentity(selected_identity, user_profile.s4);
			const selected_displayName = util.displayNameForIdentity(selected_identity, user_profile.s4);

			let section_identitiesButton: React.ReactNode|null = null;
			if (identities.length > 1)
			{
				section_identitiesButton = (
					<Tooltip title="Show all identities linked to user's account.">
						<IconButton onClick={this.userIdentsMenuButtonClicked}>
							<Badge badgeContent={identities.length} color="primary">
								<MoreVertIcon />
							</Badge>
						</IconButton>
					</Tooltip>
				);
			}

			const section_identity = (
				<div className={classes.section_identity}>
					<Avatar className={classes.section_identity_avatar}>
						<ReactImageFallback
							src={selected_idUrl || undefined}
							initialImage={
								<AccountCircleIcon color="primary" className={classes.section_identity_avatar_img}/>
							}
							fallbackImage={
								<AccountCircleIcon color="primary" className={classes.section_identity_avatar_img}/>
							}
							width={AVATAR_SIZE}
							height={AVATAR_SIZE}
						/>
					</Avatar>
					<div className={classes.section_identity_nameAndProvider}>
						<Typography variant="headline" className={classes.section_identity_name}>
							{selected_displayName}
						</Typography>
						<img src={selected_idpUrl} height="22" className={classes.identityProviderImg}/>
					</div>
					{section_identitiesButton}
				</div>
			);

			const section_menu = (
				<Menu
					anchorEl={state.userIdentsMenuAnchor}
					open={state.userIdentsMenuOpen}
					onClose={this.userIdentsMenuClosed}
				>
				{identities.map((identity, index) => {

					const idpUrl = util.imageUrlForIdentityProvider_64(identity);
					const idUrl = util.imageUrlForIdentity(identity, user_profile.s4);
					const displayName = util.displayNameForIdentity(identity, user_profile.s4);

					const onClick = this.userIdentsMenuItemSelected.bind(this, index);

					return (
						<MenuItem
							key={`${identity.user_id}`}
							selected={selected_identityIdx == index}
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

			return (
				<React.Fragment>
					{section_identity}
					{section_menu}
				</React.Fragment>
			);
		}
		else
		{
			return (
				<div className={classes.section_identity}></div>
			);
		}
	}

	public renderExpansionPanel1(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const user_id = this.props.user_id;
		const user_profile = state.user_profile;
		const pub_key = state.public_key;

		let displayName = user_id;
		if (user_profile)
		{
			const identityIdx = this.getIdentityIdx();
			const identity = user_profile.auth0.identities[identityIdx];

			displayName = util.displayNameForIdentity(identity, user_profile.s4);
		}

		const profileUrl = util.profileUrlForUser(user_id);

		let pubKeyUrl: string|null = null;
		if (user_profile) {
			pubKeyUrl = util.pubKeyUrlForUser(user_profile.s4);
		}

		let section_summary: React.ReactNode;
		if (state.is_fetching_public_key)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Fetching user's public key..."}
					</Typography>
				</div>
			);
		}
		else if (state.public_key_err_msg)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<ReportProblemIcon color="error"/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{state.public_key_err_msg || "Generic error message"}
					</Typography>
				</div>
			);
		}
		else
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CheckCircleIcon nativeColor='green' />
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Fetched user's public key"}
					</Typography>
				</div>
			);
		}

		let section_li_pubKey;
		if (pubKeyUrl) {
			section_li_pubKey = (
				<li>
					The user's public key is <a href={pubKeyUrl} className={classes.a_noLinkColor}>here</a>.
				</li>
			)
		}

		let section_pubKeyDetails: React.ReactFragment|null = null;
		if (pub_key)
		{
			section_pubKeyDetails = (
				<React.Fragment>
					<Typography paragraph={true}>
						Public Key Details
					</Typography>
					<Typography component="ul" paragraph={true}>
						<li>Type: ECC {pub_key.keySuite}</li>
						<li className={classes.wrap}>Value <span className={classes.gray}>(Base64)</span>: {pub_key.pubKey}</li>
					</Typography>
				</React.Fragment>
			);
		}

		const section_details = (
			<div className={classes.section_expansionPanel_details}>
				<Typography paragraph={true}>
					Every Storm4 user has a public/private key pair.
					The private key is known <span className={classes.span_underline}>ONLY</span> to
					the user. (The server does not know it.)
				</Typography>
				<Typography paragraph={true}>
					We're going to use the public key when encrypting the file. 
					This ensures that only "{displayName}" can decrypt it.
					The file is encrypted in your browser, and then the encrypted
					version is uploaded to the cloud.
				</Typography>
				<Typography component="ul" paragraph={true}>
					<li>
						The user's public profile is <a href={profileUrl} className={classes.a_noLinkColor}>here</a>.
					</li>
					{section_li_pubKey}
				</Typography>
				<Typography paragraph={true}>
					Crypto Details:
				</Typography>
				<Typography paragraph={true} className={classes.indented}>
					A random 512-bit key is generated within the browser,
					and is then used to encrypt the file
					using <a href="https://en.wikipedia.org/wiki/Threefish" className={classes.a_noLinkColor}>Threefish</a>.
					The file's encryption key is then encrypted to the user's public key,
					and then both blobs (the encrypted file & the encrypted key) are
					uploaded to the cloud.
				</Typography>
				{section_pubKeyDetails}
			</div>
		);

		return (
			<ExpansionPanel>
				<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
					{section_summary}
				</ExpansionPanelSummary>
				<ExpansionPanelDetails>
					{section_details}
				</ExpansionPanelDetails>
			</ExpansionPanel>
		);
	}

	public renderExpansionPanel2(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const user_id = this.props.user_id;
		const user_profile = state.user_profile;

		const user_id_hex = util.userID2Hex(user_id);

		const merkle_tree_root = state.merkle_tree_root;

		let section_summary: React.ReactNode;
		if (state.is_fetching_merkle_tree_root || state.is_fetching_merkle_tree_file)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{state.is_fetching_merkle_tree_root
							? "Fetching blockchain verification (1 of 2)..."
							: "Fetching blockchain verification (2 of 2)..."}
					</Typography>
				</div>
			);
		}
		else if (state.merkle_tree_root_err_msg || state.merkle_tree_file_err_msg)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<ReportProblemIcon color="error"/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{state.merkle_tree_root_err_msg || state.merkle_tree_file_err_msg}
					</Typography>
				</div>
			);
		}
		else if (merkle_tree_root != null)
		{
			if (merkle_tree_root.length == 0)
			{
				section_summary = (
					<div className={classes.section_expansionPanel_summary}>
						<ReportProblemIcon nativeColor="yellow"/>
						<Typography className={classes.section_expansionPanel_summary_text}>
							{"Public key not posted to blockchain yet"}
						</Typography>
					</div>
				);
			}
			else
			{
				section_summary = (
					<div className={classes.section_expansionPanel_summary}>
						<CheckCircleIcon nativeColor='green' />
						<Typography className={classes.section_expansionPanel_summary_text}>
							{"Fetched blockchain verification"}
						</Typography>
					</div>
				);
			}
		}
		else
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Initializing..."}
					</Typography>
				</div>
			);
		}

		const rpc_data = JSON.stringify(util.rpcJSON(user_id), null, 0);
		const rpc_url = util.rpcURL();
		const rpc_call =
			`curl -X POST -H "Content-Type: application/json" -d '${rpc_data}' ${rpc_url}`;

		let contract_response: string;
		let merkle_tree_url: string;
		if (merkle_tree_root == null) {
			contract_response = "fetching...";
			merkle_tree_url   = "fetching...";
		}
		else if (merkle_tree_root.length == 0) {
			contract_response = "not available (user not on blockchain yet)";
			merkle_tree_url   = "not available (user not on blockchain yet)";
		}
		else {
			contract_response = merkle_tree_root;
			merkle_tree_url = util.merkleTreeFileURL(merkle_tree_root);
		}

		const section_details = (
			<div className={classes.section_expansionPanel_details}>
				<Typography paragraph={true}>
					Storm4 uses the <a href="https://www.ethereum.org/" className={classes.a_noLinkColor}>Ethereum</a> blockchain
					to independently verify the user's public key. This protects you from
					hackers and related man-in-the-middle problems. Read more about it on
					our <a href="https://www.storm4.cloud/blockchain.html" className={classes.a_noLinkColor}>website</a>.
				</Typography>
				<Typography paragraph={true} component="blockquote" className={classes.blockquote}>
					Ethereum is a decentralized platform that runs smart contracts: applications that
					run exactly as programmed without any possibility of downtime, censorship, fraud
					or third party interference.
				</Typography>
				<Typography paragraph={true}>
					We wrote and deployed a smart contract that stores the user's public key
					information on the blockchain. And it's written in such a way that
					allows the public key info to be written once & only once.
					Since the smart contract itself is immutable (due to the nature of Ethereum),
					this creates an immutable record of the public key. Thus the keys of Storm4
					users are immutable, verifiable, auditable & tamper-proof.
				</Typography>
				<Typography component="ul" paragraph={true}>
					<li>Smart contract: <a href="https://etherscan.io/address/0xf8cadbcadbeac3b5192ba29df5007746054102a4#code" className={classes.a_noLinkColor}>deployed code</a></li>
					<li>User ID <span className={classes.gray}>(zBase32)</span>: {user_id}</li>
					<li>User ID <span className={classes.gray}>(hex)</span>: {user_id_hex}</li>
					<li>
						RPC Call:
						<ul className={classes.sub_ul}>
							<li className={classes.sub_ul_li}>
								{rpc_call}
							</li>
						</ul>
					</li>
					<li>Contract Call:
						<ul className={classes.sub_ul}>
							<li className={classes.sub_ul_li}>
								getMerkleTreeRoot({user_id_hex}, 0)
							</li>
							<li className={classes.sub_ul_li}>
								<a href="https://etherscan.io/address/0xf8cadbcadbeac3b5192ba29df5007746054102a4#readContract" className={classes.a_noLinkColor} target="_blank">
									try it yourself
								</a>
							</li>
						</ul>
					</li>
					<li>
						Contract Response:
						<ul className={classes.sub_ul}>
							<li className={classes.sub_ul_li}>
								{contract_response}
							</li>
						</ul>
					</li>
					<li className={classes.wrap}>
						Merkle Tree File: <a href={merkle_tree_url} className={classes.a_noLinkColor}>link</a>
					</li>
				</Typography>
			</div>
		);

		return (
			<ExpansionPanel>
				<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
					{section_summary}
				</ExpansionPanelSummary>
				<ExpansionPanelDetails>
					{section_details}
				</ExpansionPanelDetails>
			</ExpansionPanel>
		);
	}

	public renderExpansionPanel3(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const user_id = this.props.user_id;

		const pub_key = state.public_key;
		const merkle_tree_root = state.merkle_tree_root;
		const merkle_tree_file = state.merkle_tree_file;

		let section_summary: React.ReactNode;
		if (state.is_verifying_public_key)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Verifying public key..."}
					</Typography>
				</div>
			);
		}
		else if (state.pubkey_tampering_detected)
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<ReportProblemIcon color="error"/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Public key has been tampered with! File sending is disabled."}
					</Typography>
				</div>
			);
		}
		else if (_.isBoolean(state.pubkey_verifcation_success))
		{
			if (state.pubkey_verifcation_success == false)
			{
				section_summary = (
					<div className={classes.section_expansionPanel_summary}>
						<ReportProblemIcon nativeColor="yellow"/>
						<Typography className={classes.section_expansionPanel_summary_text}>
							{"Unable to verify public key"}
						</Typography>
					</div>
				);
			}
			else
			{
				section_summary = (
					<div className={classes.section_expansionPanel_summary}>
						<CheckCircleIcon nativeColor='green' />
						<Typography className={classes.section_expansionPanel_summary_text}>
							{"Public key verified"}
						</Typography>
					</div>
				);
			}
		}
		else
		{
			section_summary = (
				<div className={classes.section_expansionPanel_summary}>
					<CircularProgress
						color="secondary"
						size={16}
					/>
					<Typography className={classes.section_expansionPanel_summary_text}>
						{"Initializing..."}
					</Typography>
				</div>
			);
		}

		let section_details: React.ReactNode;
		if (pub_key && merkle_tree_root && merkle_tree_file)
		{
			const keyID_verification =
				`echo -n "${pub_key.pubKey}" | base64 --decode | openssl dgst -sha256 | cut -c -32 | xxd -r -p | base64`;

			const merkle_tree_url = util.merkleTreeFileURL(merkle_tree_root);

			let merkle_tree_value: string;
			{
				const values_idx = merkle_tree_file.lookup[user_id];
				if (values_idx == null || values_idx < 0 || values_idx >= merkle_tree_file.values.length)
				{
					merkle_tree_value = "Not found in merkle tree file !";
				}
				else
				{
					merkle_tree_value = merkle_tree_file.values[values_idx];
				}
			}

			section_details = (
				<div className={classes.section_expansionPanel_details}>
					<Typography component="ul" paragraph={true}>
						<li className={classes.wrap}>
							Public Key <span className={classes.gray}>(Base64)</span>: {pub_key.pubKey}
						</li>
						<li className={classes.wrap}>
							KeyID <span className={classes.gray}>(Base64)</span>: {pub_key.keyID}
						</li>
						<li className={classes.wrap}>
							KeyID Verification:
							<ul className={classes.sub_ul}>
								<li className={classes.sub_ul_li}>
									{keyID_verification}
								</li>
							</ul>
						</li>
					</Typography>
					<Typography component="ul" paragraph={true}>
						<li className={classes.wrap}>
							Merkle Tree File: <a href={merkle_tree_url} className={classes.a_noLinkColor}>link</a>
						</li>
						<li className={classes.wrap}>
							Merkle Tree Value: <span className={classes.gray}>(JSON)</span>: {merkle_tree_value}
						</li>
					</Typography>
					<Typography component="ul" paragraph={true}>
						<li className={classes.wrap}>
							Calculated Merkle Tree Root:
							<ul className={classes.sub_ul}>
								<li className={classes.sub_ul_li}>
									{state.calculated_merkle_tree_root || ""}
								</li>
							</ul>
						</li>
						<li className={classes.wrap}>
							Calculated With: <a href="https://github.com/devedge/merkle-tree-gen" className={classes.a_noLinkColor}>merkle-tree-gen</a>
						</li>
					</Typography>
				</div>
			);
		}
		else
		{
			section_details = (
				<div className={classes.section_expansionPanel_details}>
				</div>
			);
		}

		return (
			<ExpansionPanel>
				<ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
					{section_summary}
				</ExpansionPanelSummary>
				<ExpansionPanelDetails>
					{section_details}
				</ExpansionPanelDetails>
			</ExpansionPanel>
		);
	}
	
	public render(): React.ReactNode {
		const state = this.state;
		const {classes} = this.props;

		const section_userProfile = this.renderUserProfile();

		if (state.user_profile == null)
		{
			return (
				<div className={classes.root}>
					{section_userProfile}
				</div>
			);
		}
		else
		{
			const section_expantionPanel1 = this.renderExpansionPanel1();
			const section_expantionPanel2 = this.renderExpansionPanel2();
			const section_expantionPanel3 = this.renderExpansionPanel3();

			return (
				<div className={classes.root}>
					{section_userProfile}
					<div className={classes.section_expansionPanels}>
						{section_expantionPanel1}
						{section_expantionPanel2}
						{section_expantionPanel3}
					</div>
				</div>
			);
		}
	}

	public componentDidMount() {
		log.debug("componentDidMount()");

		log.debug("query parameters: "+ this.props.location.search);

		this.fetchUserProfile();
	}
}

export default withStyles(styles)(withRouter(Send));