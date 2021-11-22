import { Ask, Transaction, Token, AskHistory, Collection } from "../types";
import { getCollectionPrices } from "../utils";
import { MoonbeamCall } from '@subql/contract-processors/dist/moonbeam';
import { BigNumber } from "ethers";

type TokenDelistedCallArgs = [string, BigNumber, BigNumber] & { ca: string; tokenId: BigNumber; };

export async function handleTokenDelisted(event: MoonbeamCall<TokenDelistedCallArgs>): Promise<void> {
    let transaction = await Transaction.get(event.hash);
    if (!event.success || typeof transaction !== 'undefined') {
        return;
    }

    const id = `${event.args.ca}-${event.args.tokenId.toBigInt()}`;
    const askHistoryId = `${event.args.ca}-${event.args.tokenId.toBigInt()}-${event.hash}`;

    // UDPDATE TOKEN
    let token = await Token.get(id);
    token.currentAsk = BigInt(0);
    await token.save();

    // REMOVE CURRENT ASK
    await Ask.remove(id);

    // SAVE DELIST TO ASK HISTORY
    let newAskHistory = new AskHistory(askHistoryId);
    newAskHistory.tokenId = id;
    newAskHistory.collectionId = event.args.ca;
    newAskHistory.value = BigInt(0);
    newAskHistory.timestamp = BigInt(event.timestamp);
    newAskHistory.accepted = false;
    await newAskHistory.save();

    // UPDATE COLLECTION
    let collection = await Collection.get(token.collectionId);
    let [floorPrice, ceilingPrice] = await getCollectionPrices(token.collectionId);
    collection.floor = floorPrice;
    collection.ceiling = ceilingPrice;
    await collection.save();

    logger.info(`[TOKEN DELISTED] tx: ${event.hash}; token: ${event.args.tokenId}; collection: ${event.args.ca};`)

    // SAVE TRANSACTION
    transaction = new Transaction(event.hash);
    transaction.timestamp = BigInt(event.timestamp);
    await transaction.save();
}