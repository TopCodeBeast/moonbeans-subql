import { Collection, Transaction } from "../types";
import { MoonbeamCall } from '@subql/contract-processors/dist/moonbeam';

type CollectionEnabledCall = [string, boolean] & { ca: string; value: boolean};

export async function handleCollectionEnabled(event: MoonbeamCall<CollectionEnabledCall>): Promise<void> {
    let transaction = await Transaction.get(event.hash);
    if (!event.success || typeof transaction !== 'undefined') {
        return;
    }

    let collection = await Collection.get(event.args.ca);
    if (typeof collection === 'undefined') {
        collection = new Collection(event.args.ca);
        collection.ceiling = BigInt(0);
        collection.floor = BigInt(0);
        collection.volumeOverall = BigInt(0);
        await collection.save();

        logger.info(`[COLLECTION ENABLED] tx: ${event.hash}; collection: ${event.args.ca}; value: ${event.args.value}`)
    } else {
        logger.error(`[COLLECTION ENABELED] already exists! tx: ${event.hash}; collection: ${event.args.ca}; value: ${event.args.value}`)
    }

    // SAVE TRANSACTION
    transaction = new Transaction(event.hash);
    transaction.timestamp = BigInt(event.timestamp);
    await transaction.save();
}