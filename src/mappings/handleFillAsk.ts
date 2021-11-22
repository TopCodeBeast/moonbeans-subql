import { Ask, AskHistory, Token, Collection, Fill, Transaction } from "../types";
import { getCollectionPrices } from "../utils";
import { MoonbeamCall } from '@subql/contract-processors/dist/moonbeam';
import { BigNumber } from "ethers";

type FillAskCallArgs = [string, BigNumber] & { ca: string; tokenId: BigNumber; }

export async function handleFillAsk(event: MoonbeamCall<FillAskCallArgs>): Promise<void> {
    let transaction = await Transaction.get(event.hash);
    if (!event.success || typeof transaction !== 'undefined') {
        return;
    }

    const id = `${event.args.ca}-${event.args.tokenId.toBigInt()}`;
    const fillId = `${event.args.ca}-${event.args.tokenId.toBigInt()}-${event.hash}`;

    let ask = await Ask.get(id);
    if (typeof ask !== 'undefined') {
        const askHistoryId = `${event.args.ca}-${event.args.tokenId.toBigInt()}-${ask.txHash}`;

        // UPDATE TOKEN
        let token = await Token.get(id);
        token.currentAsk = BigInt(0);
        await token.save();

        // SAVE FILL
        let fill = new Fill(fillId);
        fill.value = ask.value;
        fill.buyer = event.from;
        fill.collectionId = event.args.ca;
        fill.timestamp = BigInt(event.timestamp);
        fill.tokenId = id;
        fill.type = 'ask';
        await fill.save();

        // REMOVE CURRENT ASK
        await Ask.remove(id);

        // UPDATE OLD ASK HISTORY
        let oldAskHistory = await AskHistory.get(askHistoryId);
        oldAskHistory.accepted = true;
        await oldAskHistory.save();

        // SAVE DELIST TO ASK HISTORY
        let newAskHistory = new AskHistory(fillId);
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
        collection.volumeOverall = collection.volumeOverall + ask.value;
        await collection.save();

        logger.info(`[FILL ASK] tx: ${event.hash}; token: ${event.args.tokenId}; collection: ${event.args.ca}; price: ${ask.value}`)
    } else {
        logger.error(`[FILL ASK] failed! tx: ${event.hash}; token: ${event.args.tokenId}; collection: ${event.args.ca}`)
    }

    // SAVE TRANSACTION
    transaction = new Transaction(event.hash);
    transaction.timestamp = BigInt(event.timestamp);
    await transaction.save();
}