"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { formatEther, parseEther, isAddress } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  TITHE_JAR_ADDRESS,
  TITHE_JAR_ABI,
  isDeployed,
  addrUrl,
  txUrl,
} from "@/lib/contract";
import { monadTestnet } from "@/lib/wagmi";

type Gift = {
  giver: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
  memo: string;
};

const short = (a?: string) =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
const fmt = (v?: bigint, dp = 4) =>
  v === undefined ? "—" : Number(formatEther(v)).toFixed(dp).replace(/\.?0+$/, "");
const ago = (ts: bigint) => {
  const s = Math.floor(Date.now() / 1000) - Number(ts);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const wrongNetwork = isConnected && chainId !== monadTestnet.id;

  return (
    <div className="relative z-[1] mx-auto min-h-screen w-full max-w-5xl px-5 pb-24 sm:px-8">
      <Header />
      {!isDeployed && <DeployNotice />}
      {wrongNetwork && <WrongNetwork />}
      <Hero address={address} isConnected={isConnected} />
      {isConnected && !wrongNetwork && <Actions address={address!} />}
      <CommunityFeed />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Header() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const injected = connectors[0];

  return (
    <header className="flex items-center justify-between py-6">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="text-2xl">🫙</span>
        <span className="display text-xl font-semibold">Tithe Jar</span>
      </div>
      {isConnected ? (
        <div className="flex items-center gap-2">
          <a
            className="pill link"
            href={addrUrl(address!)}
            target="_blank"
            rel="noreferrer"
          >
            <span className="dot" style={{ background: "var(--sage)" }} />
            {short(address)}
          </a>
          <button className="btn btn-ghost" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary"
          disabled={isPending || !injected}
          onClick={() => injected && connect({ connector: injected })}
        >
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
      )}
    </header>
  );
}

function DeployNotice() {
  return (
    <div className="card" style={{ borderColor: "var(--line-strong)" }}>
      <p className="text-sm" style={{ color: "var(--taupe)" }}>
        The contract address isn&apos;t set yet. Deploy{" "}
        <span className="mono">TitheJar</span> to Monad testnet and set{" "}
        <span className="mono">NEXT_PUBLIC_TITHE_JAR_ADDRESS</span> to go live.
      </p>
    </div>
  );
}

function WrongNetwork() {
  return (
    <div
      className="card mt-4"
      style={{ borderColor: "var(--amber)", background: "var(--ink-3)" }}
    >
      <p className="text-sm" style={{ color: "var(--amber-glow)" }}>
        You&apos;re on the wrong network. Switch your wallet to{" "}
        <b>Monad Testnet</b> (chain {monadTestnet.id}) to set aside and give.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Hero({
  address,
  isConnected,
}: {
  address?: `0x${string}`;
  isConnected: boolean;
}) {
  const { data: jar } = useReadContract({
    address: TITHE_JAR_ADDRESS,
    abi: TITHE_JAR_ABI,
    functionName: "jarBalance",
    args: address ? [address] : undefined,
    query: { enabled: isDeployed && !!address },
  });
  const { data: given } = useReadContract({
    address: TITHE_JAR_ADDRESS,
    abi: TITHE_JAR_ABI,
    functionName: "totalGiven",
    args: address ? [address] : undefined,
    query: { enabled: isDeployed && !!address },
  });

  const jarBal = (jar as bigint | undefined) ?? 0n;
  const totalGiven = (given as bigint | undefined) ?? 0n;

  // remember the highest balance seen so the jar visibly fills, then pours
  const peak = useRef(0n);
  if (jarBal > peak.current) peak.current = jarBal;
  const cap = peak.current > 0n ? peak.current : parseEther("0.05");
  let frac = Number(jarBal) / Number(cap);
  if (jarBal > 0n) frac = Math.max(0.06, Math.min(frac, 0.95));
  else frac = 0;

  return (
    <section className="grid items-center gap-8 py-10 sm:grid-cols-[auto_1fr] sm:gap-14 sm:py-16">
      <div
        className="jar-wrap mx-auto"
        style={{ ["--fill-frac" as string]: frac.toFixed(3) }}
      >
        <div className="jar-halo" />
        <div className="jar-lid" />
        <div className="jar">
          <div className="jar-fill" />
        </div>
      </div>

      <div className="text-center sm:text-left">
        <p className="eyebrow mb-3">A giving jar you can trust</p>
        <h1 className="display text-4xl font-semibold leading-[1.05] sm:text-5xl">
          Set aside your tithe
          <br />
          as you earn.
        </h1>
        <p
          className="mx-auto mt-4 max-w-md text-[1.05rem] leading-7 sm:mx-0"
          style={{ color: "var(--taupe)" }}
        >
          Put a portion aside onchain the moment it comes in. Give it to a cause
          when you&apos;re ready. Every gift is remembered — permanently, and by
          no one&apos;s word but the chain&apos;s.
        </p>

        {isConnected && (
          <div className="mt-7 flex flex-wrap justify-center gap-8 sm:justify-start">
            <Stat label="In your jar" value={`${fmt(jarBal)} MON`} big />
            <Stat label="Given so far" value={`${fmt(totalGiven)} MON`} />
          </div>
        )}
        <p
          className="mt-8 text-sm italic"
          style={{ color: "var(--taupe-dim)" }}
        >
          “Bring the whole tithe into the storehouse.” — Malachi 3:10
        </p>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div>
      <div
        className={`mono ${big ? "text-2xl" : "text-xl"}`}
        style={{ color: big ? "var(--amber-glow)" : "var(--cream)" }}
      >
        {value}
      </div>
      <div className="eyebrow mt-1">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Actions({ address }: { address: `0x${string}` }) {
  const [prefill, setPrefill] = useState("");
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <SetAsideCard prefill={prefill} onUsed={() => setPrefill("")} />
      <TitheCalculator onSetAside={setPrefill} />
      <GiveCard address={address} />
      <YourLedger address={address} />
    </div>
  );
}

/* Shared tx-status footer for a card */
function TxStatus({
  hash,
  isPending,
  error,
  onDone,
}: {
  hash?: `0x${string}`;
  isPending: boolean;
  error?: Error | null;
  onDone?: () => void;
}) {
  const doneRef = useRef<string | undefined>(undefined);
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });
  if (isSuccess && hash && doneRef.current !== hash) {
    doneRef.current = hash;
    onDone?.();
  }
  if (error)
    return (
      <p className="mt-3 text-sm" style={{ color: "#e08b6a" }}>
        {error.message.split("\n")[0]}
      </p>
    );
  if (isPending)
    return (
      <p className="mt-3 text-sm" style={{ color: "var(--taupe)" }}>
        Confirm in your wallet…
      </p>
    );
  if (isLoading)
    return (
      <p className="mt-3 text-sm" style={{ color: "var(--taupe)" }}>
        Writing to the chain…
      </p>
    );
  if (isSuccess && hash)
    return (
      <p className="mt-3 text-sm" style={{ color: "var(--sage)" }}>
        Done.{" "}
        <a className="link" href={txUrl(hash)} target="_blank" rel="noreferrer">
          View on explorer →
        </a>
      </p>
    );
  return null;
}

function SetAsideCard({
  prefill,
  onUsed,
}: {
  prefill: string;
  onUsed: () => void;
}) {
  const [amount, setAmount] = useState("");
  const value = prefill || amount;
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();

  let parsed: bigint | null = null;
  try {
    parsed = value ? parseEther(value) : null;
  } catch {
    parsed = null;
  }

  return (
    <div className="card">
      <div className="card-hd">
        <h2 className="display text-lg font-semibold">Set aside</h2>
        <span className="pill">fills your jar</span>
      </div>
      <label className="label" htmlFor="setaside-amt">
        Amount (MON)
      </label>
      <input
        id="setaside-amt"
        className="field"
        inputMode="decimal"
        placeholder="0.10"
        value={value}
        onChange={(e) => {
          onUsed();
          setAmount(e.target.value);
        }}
      />
      <button
        className="btn btn-primary mt-4 w-full"
        disabled={!parsed || parsed <= 0n || isPending}
        onClick={() => {
          reset();
          writeContract({
            address: TITHE_JAR_ADDRESS,
            abi: TITHE_JAR_ABI,
            functionName: "setAside",
            value: parsed!,
          });
        }}
      >
        Set aside {parsed ? `${value} MON` : ""}
      </button>
      <TxStatus
        hash={hash}
        isPending={isPending}
        error={error}
        onDone={() => setAmount("")}
      />
    </div>
  );
}

function TitheCalculator({
  onSetAside,
}: {
  onSetAside: (v: string) => void;
}) {
  const [income, setIncome] = useState("");
  const [pct, setPct] = useState(10);
  const tithe = useMemo(() => {
    const n = parseFloat(income);
    if (!isFinite(n) || n <= 0) return 0;
    return (n * pct) / 100;
  }, [income, pct]);

  return (
    <div className="card">
      <div className="card-hd">
        <h2 className="display text-lg font-semibold">What&apos;s a tithe?</h2>
        <span className="pill">a helper</span>
      </div>
      <label className="label" htmlFor="income">
        Income received (MON)
      </label>
      <input
        id="income"
        className="field"
        inputMode="decimal"
        placeholder="1.00"
        value={income}
        onChange={(e) => setIncome(e.target.value)}
      />
      <div className="mt-3 flex gap-2">
        {[10, 15, 20].map((p) => (
          <button
            key={p}
            className={`btn ${pct === p ? "btn-primary" : "btn-ghost"} flex-1`}
            onClick={() => setPct(p)}
          >
            {p}%
          </button>
        ))}
      </div>
      <div
        className="mt-4 flex items-baseline justify-between rounded-xl px-3 py-3"
        style={{ background: "var(--ink)" }}
      >
        <span className="eyebrow">Your {pct}%</span>
        <span className="mono text-xl" style={{ color: "var(--amber-glow)" }}>
          {tithe ? tithe.toFixed(4).replace(/\.?0+$/, "") : "0"} MON
        </span>
      </div>
      <button
        className="btn btn-ghost mt-3 w-full"
        disabled={!tithe}
        onClick={() => onSetAside(String(tithe))}
      >
        Send to “Set aside” →
      </button>
    </div>
  );
}

function GiveCard({ address }: { address: `0x${string}` }) {
  const [mode, setMode] = useState<"jar" | "direct">("jar");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();

  const { data: jar } = useReadContract({
    address: TITHE_JAR_ADDRESS,
    abi: TITHE_JAR_ABI,
    functionName: "jarBalance",
    args: [address],
    query: { enabled: isDeployed },
  });
  const jarBal = (jar as bigint | undefined) ?? 0n;

  let parsed: bigint | null = null;
  try {
    parsed = amount ? parseEther(amount) : null;
  } catch {
    parsed = null;
  }

  const recipOk = isAddress(recipient);
  const overJar = mode === "jar" && parsed !== null && parsed > jarBal;
  const canSubmit =
    recipOk && parsed !== null && parsed > 0n && !overJar && !isPending;

  const submit = () => {
    reset();
    if (mode === "jar") {
      writeContract({
        address: TITHE_JAR_ADDRESS,
        abi: TITHE_JAR_ABI,
        functionName: "give",
        args: [recipient as `0x${string}`, parsed!, memo],
      });
    } else {
      writeContract({
        address: TITHE_JAR_ADDRESS,
        abi: TITHE_JAR_ABI,
        functionName: "giveNow",
        args: [recipient as `0x${string}`, memo],
        value: parsed!,
      });
    }
  };

  return (
    <div className="card">
      <div className="card-hd">
        <h2 className="display text-lg font-semibold">Give</h2>
        <div className="flex gap-1">
          <button
            className={`btn ${mode === "jar" ? "btn-primary" : "btn-ghost"} px-3 py-1.5 text-sm`}
            onClick={() => setMode("jar")}
          >
            From jar
          </button>
          <button
            className={`btn ${mode === "direct" ? "btn-primary" : "btn-ghost"} px-3 py-1.5 text-sm`}
            onClick={() => setMode("direct")}
          >
            Direct
          </button>
        </div>
      </div>

      <label className="label" htmlFor="recip">
        Recipient address
      </label>
      <input
        id="recip"
        className="field"
        placeholder="0x…"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      {recipient && !recipOk && (
        <p className="mt-1 text-xs" style={{ color: "#e08b6a" }}>
          That doesn&apos;t look like a valid address.
        </p>
      )}

      <label className="label mt-3" htmlFor="give-amt">
        Amount (MON){" "}
        {mode === "jar" && (
          <span style={{ color: "var(--taupe-dim)" }}>
            · jar holds {fmt(jarBal)}
          </span>
        )}
      </label>
      <input
        id="give-amt"
        className="field"
        inputMode="decimal"
        placeholder="0.10"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {overJar && (
        <p className="mt-1 text-xs" style={{ color: "#e08b6a" }}>
          More than your jar holds. Set aside more, or switch to Direct.
        </p>
      )}

      <label className="label mt-3" htmlFor="memo">
        Memo (optional, onchain)
      </label>
      <input
        id="memo"
        className="field"
        placeholder="For the food pantry"
        maxLength={120}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />

      <button
        className="btn btn-primary mt-4 w-full"
        disabled={!canSubmit}
        onClick={submit}
      >
        {mode === "jar" ? "Pour out & give" : "Give directly"}
      </button>
      <TxStatus
        hash={hash}
        isPending={isPending}
        error={error}
        onDone={() => {
          setAmount("");
          setMemo("");
        }}
      />
    </div>
  );
}

function YourLedger({ address }: { address: `0x${string}` }) {
  const { data } = useReadContract({
    address: TITHE_JAR_ADDRESS,
    abi: TITHE_JAR_ABI,
    functionName: "giftsOf",
    args: [address],
    query: { enabled: isDeployed, refetchInterval: 8000 },
  });
  const gifts = ((data as Gift[] | undefined) ?? []).slice().reverse();

  return (
    <div className="card sm:col-span-2">
      <div className="card-hd">
        <h2 className="display text-lg font-semibold">Your giving</h2>
        <span className="pill">{gifts.length} recorded</span>
      </div>
      {gifts.length === 0 ? (
        <Empty>
          Nothing given yet. When you do, it&apos;ll be written here for good.
        </Empty>
      ) : (
        <div>
          {gifts.map((g, i) => (
            <GiftRow key={i} g={g} showGiver={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityFeed() {
  const { data } = useReadContract({
    address: TITHE_JAR_ADDRESS,
    abi: TITHE_JAR_ABI,
    functionName: "recentGifts",
    args: [12n],
    query: { enabled: isDeployed, refetchInterval: 10000 },
  });
  const gifts = (data as Gift[] | undefined) ?? [];

  return (
    <section className="mt-14">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="display text-2xl font-semibold">A record of giving</h2>
        <span className="eyebrow">newest first</span>
      </div>
      <div className="card">
        {!isDeployed ? (
          <Empty>Once the jar is live, every gift shows up here.</Empty>
        ) : gifts.length === 0 ? (
          <Empty>No gifts yet. Be the first to pour something out.</Empty>
        ) : (
          gifts.map((g, i) => <GiftRow key={i} g={g} showGiver />)
        )}
      </div>
    </section>
  );
}

function GiftRow({ g, showGiver }: { g: Gift; showGiver: boolean }) {
  return (
    <div className="ledger-row">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="dot" style={{ background: "var(--sage)" }} />
          <span className="mono text-sm">
            {showGiver && (
              <>
                <a className="link" href={addrUrl(g.giver)} target="_blank" rel="noreferrer">
                  {short(g.giver)}
                </a>{" "}
                →{" "}
              </>
            )}
            <a className="link" href={addrUrl(g.recipient)} target="_blank" rel="noreferrer">
              {short(g.recipient)}
            </a>
          </span>
        </div>
        {g.memo && (
          <div
            className="mt-1 truncate text-sm"
            style={{ color: "var(--taupe)" }}
          >
            “{g.memo}”
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="mono" style={{ color: "var(--amber-glow)" }}>
          {fmt(g.amount)} MON
        </div>
        <div className="eyebrow mt-0.5" style={{ letterSpacing: "0.1em" }}>
          {ago(g.timestamp)}
        </div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-sm" style={{ color: "var(--taupe-dim)" }}>
      {children}
    </p>
  );
}

function Footer() {
  return (
    <footer
      className="mt-16 border-t pt-6 text-sm"
      style={{ borderColor: "var(--line)", color: "var(--taupe-dim)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>Tithe Jar — set aside, give, remember.</span>
        <span className="mono">
          {isDeployed ? (
            <a
              className="link"
              href={addrUrl(TITHE_JAR_ADDRESS)}
              target="_blank"
              rel="noreferrer"
            >
              Contract {short(TITHE_JAR_ADDRESS)}
            </a>
          ) : (
            "on Monad testnet"
          )}
        </span>
      </div>
    </footer>
  );
}
