import { CheckIcon } from "@radix-ui/react-icons";
import { Icons } from "../lib/ui/components";

interface ConnectSafesProps {
    connectionError: string | null;
    isConnecting: boolean;
    isConnected: boolean;
    connect: () => Promise<void>;
}

function ConnectSafes({
    connectionError,
    isConnecting,
    isConnected,
    connect,
}: ConnectSafesProps): JSX.Element {
    const getTextButton = () => {
        if (isConnected) {
            return (
                <>
                    <CheckIcon width={20} height={20} />
                    {"Safes Parent and Child connected"}
                </>
            );
        } else if (isConnecting) {
            return (
                <>
                    <Icons.spinner className="h-6 w-6 animate-spin" />
                    {"Getting Safes..."}
                </>
            );
        } else {
            return "Get your Safes Parent and Child";
        }
    };

    return (
        <>
            {!connectionError ? (
                <button
                    disabled={isConnecting || isConnected || !!connectionError}
                    className="flex items-center justify-center gap-x-2.5 p-3 font-semibold text-gray-900 hover:bg-gray-100 disabled:bg-white"
                    onClick={connect}
                >
                    {getTextButton()}
                </button>
            ) : (
                <p className="flex items-center justify-center text-gray-900 bg-red-50">
                    Connection denied
                </p>
            )}
        </>
    );
}

export default ConnectSafes;
