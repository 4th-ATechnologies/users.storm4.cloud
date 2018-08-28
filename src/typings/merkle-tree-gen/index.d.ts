declare module 'merkle-tree-gen' {

	export interface MerkleTreeNode {
		type   : string,
		level  : number,
		left   : string,
		right  : string,
		parent : string
	}

	export interface MerkleTree {
		root           : string,
		hashalgo       : string,
		leaves         : number,
		levels         : number,
	//	[hash: string] : MerkleTreeNode
	}

	export function fromArray(
		options : {
			array     : string[]|any[],
			hashalgo ?: 'md4'|'md5'|'sha1'|'sha256'|'sha512'|'whirlpool'|string
		},
		callback: (
			err   : Error|null,
			tree ?: MerkleTree
		)=> void
	): void;
}