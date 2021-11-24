import { Ask, Token, AskHistory, Transaction, Collection } from "../types";
import { MoonbeamCall } from '@subql/contract-processors/dist/moonbeam';
import { BigNumber } from "ethers";

type TokenListedCallArgs = [string, BigNumber, BigNumber] & { ca: string; tokenId: BigNumber; price: BigNumber; };

export async function handleTokenListed(event: MoonbeamCall<TokenListedCallArgs>): Promise<void> {
    let transaction = await Transaction.get(event.hash);
    if (!event.success || typeof transaction !== 'undefined') {
        return;
    }
    
    const id  = `${event.args.ca}-${event.args.tokenId.toBigInt()}`;
    const askHistoryId  = `${event.args.ca}-${event.args.tokenId.toBigInt()}-${event.hash}`;
    const price = event.args.price.toBigInt();

    // CREATE OR GET COLLECTION
    let collection = await Collection.get(event.args.ca);
    if (typeof collection === 'undefined') {
        collection = new Collection(event.args.ca);
        collection.ceiling = BigInt(0);
        collection.floor = BigInt(0);
        collection.volumeOverall = BigInt(0);
        await collection.save();
    }

    // SAVE OR UPDATE TOKEN
    let token = await Token.get(id);
    if (typeof token === 'undefined') {
        token = new Token(id);
        token.tokenId = event.args.tokenId.toBigInt();
        token.collectionId = event.args.ca;
        token.currentAsk = price;
        token.lowestBid = BigInt(0);
        token.heighestBid = BigInt(0);
        await token.save();
    } else {
        token.currentAsk = event.args.price.toBigInt();
        await token.save();
    }

    // UPDATE COLLECTION
    let collectionUpdate = false;
    if (collection.ceiling <= price) {
        collection.ceiling = price;
        collectionUpdate = true;
    }

    if (collection.floor >= price) {
        collection.floor = price;
        collectionUpdate = true;
    }

    if (collectionUpdate) {
        await collection.save();
    }

    // SAVE CURRENT ASK
    const ask = new Ask(id);
    ask.tokenId = id;
    ask.value = event.args.price.toBigInt();
    ask.collectionId = event.args.ca;
    ask.timestamp = BigInt(event.timestamp);
    ask.txHash = event.hash;
    await ask.save();

    // SAVE CURRENT ASK INTO HISTORY
    const askHistory = new AskHistory(askHistoryId);
    askHistory.tokenId = id;
    askHistory.value = event.args.price.toBigInt();
    askHistory.collectionId = event.args.ca;
    askHistory.timestamp = BigInt(event.timestamp);
    askHistory.accepted = false;
    await askHistory.save();

    logger.info(`[TOKEN LISTED] tx: ${event.hash}; token: ${event.args.tokenId}; collection: ${event.args.ca}; price: ${event.args.price.toBigInt()}`)

    // SAVE TRANSACTION
    transaction = new Transaction(event.hash);
    transaction.timestamp = BigInt(event.timestamp);
    await transaction.save();
}