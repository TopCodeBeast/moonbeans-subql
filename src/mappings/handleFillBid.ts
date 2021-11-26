import { Bid, Fill, Transaction, Token, Collection, AskHistory, Ask } from "../types";
import { getTokenPrices } from "../utils";
import { MoonbeamCall } from '@subql/contract-processors/dist/moonbeam';
import { BigNumber } from "ethers";

type FillBidCallArgs = [string, BigNumber, BigNumber, string, boolean] & { ca: string; tokenId: BigNumber; price: BigNumber; from: string; escrowedBid: boolean; };

export async function handleFillBid(event: MoonbeamCall<FillBidCallArgs>): Promise<void> {
    let transaction = await Transaction.get(event.hash);
    if (!event.success || typeof transaction !== 'undefined') {
        return;
    }

    const id = `${event.args.ca}-${event.args.tokenId.toBigInt()}`;
    const fillId = `${event.args.ca}-${event.args.tokenId.toBigInt()}-${event.hash}`;

    let bid = null;
    const bids = await Bid.getByTokenId(id);
    for (let _bid of bids) {
        if (_bid.buyer.toLowerCase() == event.args.from.toLowerCase() && _bid.value == event.args.price.toBigInt()) {
            bid = _bid;
            break;
        } 
    }

    if (bid !== null) {
        // SAVE FILL
        const fill = new Fill(fillId);
        fill.value = bid.value;
        fill.collectionId = event.args.ca;
        fill.buyer = bid.buyer;
        fill.timestamp = BigInt(event.timestamp);
        fill.tokenId = id;
        fill.type = 'bid';
        await fill.save();

        // REMOVE CURRENT BID
        await Bid.remove(bid.id);

        // REMOVE CURRENT ASK IF LISTED
        let ask = await Ask.get(id);
        if (typeof ask !== 'undefined') {
            await Ask.remove(id);

            // SAVE DELIST TO ASK HISTORY
            let newAskHistory = new AskHistory(fillId);
            newAskHistory.tokenId = id;
            newAskHistory.collectionId = event.args.ca;
            newAskHistory.value = BigInt(0);
            newAskHistory.timestamp = BigInt(event.timestamp);
            newAskHistory.accepted = false;
            await newAskHistory.save();
        }

        // UPDATE TOKEN
        let token = await Token.get(id);
        let [lowestBid, heighestBid] =  await getTokenPrices(id);
        token.lowestBid = lowestBid;
        token.heighestBid = heighestBid;
        token.currentAsk = BigInt(0);
        await token.save();

        // UPDATE COLLECTION
        let collection = await Collection.get(token.collectionId);
        collection.volumeOverall = collection.volumeOverall + bid.value;
        await collection.save();

        logger.info(`[FILL BID] tx: ${event.hash}; token: ${event.args.tokenId}; collection: ${event.args.ca}; price: ${event.args.price.toBigInt()}`)
    } else {
        logger.error(`[FILL BID] failed! tx: ${event.hash}; token: ${event.args.tokenId}; collection: ${event.args.ca}; price: ${event.args.price.toBigInt()}`);
    }

    // SAVE TRANSACTION
    transaction = new Transaction(event.hash);
    transaction.timestamp = BigInt(event.timestamp);
    await transaction.save();
}