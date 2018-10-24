This is the source code for the website: [https://users.storm4.cloud](https://users.storm4.cloud)

### Overview

This project allows anybody to send files **securely** to Storm4 users.

And when I say securely, I mean real security. As in, when Alice sends a file to Bob, **there’s nobody else in the entire world who can read the file** except Bob. Not even the engineers who maintain the backend servers. Not even the development team who writes the code. Nobody. Nada.

### Security

It starts with public key cryptography. Every Storm4 user generates a public key & private key. The public key is, well, public. And the private key is known only by the user. If data is encrypted using the public key, then only the private key can be used to decrypt it. And since only the user knows their private key, only the user can decrypt the file.

That’s all well and good. And it’s the same technology you rely on to send credit card information over the Internet. The big question is: How does Alice get Bob’s public key in the first place?

First, Storm4 makes it easy to search for users within the system. Users can optionally link their social accounts (e.g. LinkedIn, Facebook, GitHub, and many more) to their Storm4 account. And that makes it possible to search for people using identities that are already familiar.

Next, Storm4 makes it easy to download their public key. But WAIT! There’s a well-known problem in computer science & cryptography called the [man-in-the-middle attack](https://en.wikipedia.org/wiki/Man-in-the-middle_attack).

And that's where the Smart Contract comes into play.

### Smart Contract Details

Problem:

Alice can easily download Bob’s public key from the Storm4 servers. But how can she be sure it's really Bob's public key? How does she know the Storm4 servers haven't been hacked? In other words, she needs a way to verify the authenticity of the key. This should be done using an independent trusted 3rd party.

Solution:

[Ethereum](https://www.ethereum.org/) is a decentralized platform that runs “smart contracts”. And the term “smart contract” is just a fancy way of saying “small computer program”. However, there is a reason they use the term “contract” (beyond brilliant marketing). And that’s because an application deployed to the Ethereum network can never be modified in any way.

That is to say, you cannot ever change the code of a deployed app. You can call functions in the app that might change the data that’s stored within the app. But the code itself is immutable.

And it’s this immutability which makes it the perfect tool for thwarting that evil man-in-the-middle attack.

With Storm4, the trusted 3rd party used to verify public keys is the Ethereum Blockchain. Here’s the 10,000 foot overview:

- There’s a smart contract deployed to the Ethereum blockchain
- This contract allows a user’s public key information to be set once (and only once)
- Bob’s public key information has been set within the smart contract, and is verifiable by anyone
- Alice can query the smart contract to get all the information she needs to verify the authenticity of Bob’s public key
- This web app (and the Storm4 native apps) do this automatically before sending files.

The smart contract is available for anybody to read [here](https://etherscan.io/address/0x997715D0eb47A50D7521ed0D2D023624a4333F9A#code). And we have a full writeup on how the code works, and how you can interact with it on our [blog](https://medium.com/storm4/how-the-storm4-smart-contract-works-a3e242f1bf65).

### Encryption Details

Continuing with our example of Alice sending a file to Bob:

First Alice fetches Bob's public key, and then verifies it using the smart contract. (The key uses ECC curve 41417). Now she's ready to send a file securely:

- First she generates a random 512-bit key. (If sending multiple files, each file uses a different random key.)
- Next she "wraps" the randomly generated 512-bit key using Bob's public key. (I.E. she encrypts the 512-bit key using Bob's public key, so that only Bob's private key can decrypt it.)
- Next she creates a metadata file that contains the wrapped key.
- Then she adds other metadata information to the file. This includes info such as the filename & mime type. This information is encrypted using the 512-bit key. (Thus only Bob will be able to unwrap the key, and then decrypt this metadata info.)
- Next the metadata file is uploaded to Bob's inbox.
- Next she encrypts the actual file (with the 512-bit key) using [Threefish](https://en.wikipedia.org/wiki/Threefish), and uploads it to Bob's inbox.

If Alice is sending multiple files to Bob, the above steps are repeated for each file. (Remember, each file uses a different randomly generated key.)

After sending all the files, a "message" is created. This includes the list of all files that Alice sent, as well as an optional message that she may have added. Just like the metadata files sent earlier, all this information is also encrypted such that only Bob's private key can be used to decrypt it.

Want more details on the crypto? Check out our blog article: [How does Storm4 work ?](https://medium.com/storm4/how-does-storm4-work-e3d7b9afd683)

### Encryption Library

Encryption is performed using the [S4](https://github.com/4th-ATechnologies/S4) encryption library, which is a very modern crypto lib supporting some of the best new crypto.

> Understanding the term "encryption library": Does a "library" write books? No, a library is a place that houses books written by others. Similarly, an "encryption library" is just a nice wrapper that houses encryption algorithms written by others.
> 
> So S4 should be properly understood as a wrapper that makes it easy to use existing reference implementations (almost always written in C) of various crypto algorithms (written by others).

S4 supports the encryption routines we need:

- Threefish 512
- ECC curve 41417

Additionally, it can be compiled into [WebAssembly](https://webassembly.org/), and thus used in any modern browser.

There's an easy-to-use javascript wrapper for using it here.

### The code

The code is **Typescript + React**.

It was bootstrapped using [create-react-app](https://github.com/facebook/create-react-app) (with typescript [support](https://github.com/Microsoft/TypeScript-React-Starter)). As such, it's easy to get up-and-running:

```
$ git clone <this repo>
$ cd users.storm4.cloud
$ npm install
$ npm run start
```

You are free to use the code for any purpose. Common requests we receive from Storm4 users:

- The ability to theme their specific page
- A custom widget for their website, wordpress, weebly...

These are all possible, if you code it yourself :D - and this codebase serves as a reference implementation.