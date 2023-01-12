import * as React from "react";
import styles from "../styles/Home.module.css";
import { useState } from "react";
import Header from "../components/header";
import testABI from "../components/abi/test.json";
import { getAccount } from "@wagmi/core";
import { useToast } from "@chakra-ui/react";
import {
  FormControl,
  Input,
  Button,
  ButtonGroup,
  Heading,
  Center,
} from "@chakra-ui/react";
import { Card, CardBody } from "@chakra-ui/react";
import {
  useContract,
  useSigner,
  useWaitForTransaction,
} from "wagmi";

interface FormValues {
  title: string;
  addresses: string[];
  description: string;
  groupDescription: string;
  createdAt: number;
  deadline: number;
}

let myResponse: {
  name: "";
  rootHash: "";
  pollId: 0;
  title: "";
  deadline: 0;
} = {
  name: "",
  rootHash: "",
  pollId: 0,
  title: "",
  deadline: 0,
};

const SEMAPHORE_CONTRACT = "0x3605A3A829422c06Fb53072ceF27aD556Fb9f650";

// Generate a form poll that allows a user to enter FormValues and upload a .csv
export default function GeneratePoll() {
  const [title, setTitle] = useState<string>("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [groupDescription, setGroupDescription] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<number>(0);
  const [deadline, setDeadline] = useState<number>(0);
  const [tempAddresses, setTempAddresses] = useState<string>("");
  const account = getAccount();
  const [dbLoading, setDbLoading] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const { data: signer } = useSigner();
  const toast = useToast();
  const [currHash, setHash] = useState();
  const { data, isError, isLoading } = useWaitForTransaction({
    hash: currHash,
  });
  const contract = useContract({
    address: SEMAPHORE_CONTRACT,
    abi: testABI,
    signerOrProvider: signer,
  });

  const postData = async () => {
    const body = {
      data: {
        title: title,
        addresses: addresses,
        description: description,
        groupDescription: groupDescription,
        createdAt: createdAt,
        deadline: deadline,
      },
    };

    console.log("data to print: ", body);

    const response = await fetch("/api/generatePoll", {
      method: "POST",
      body: JSON.stringify(body),
    });
    console.log(response);
    if (response.status === 200) {
      const contentType = response.headers.get("content-type");
      const temp = await response.json();
      myResponse = temp;
      return temp;
    } else {
      console.warn("Server returned error status: " + response.status);
    }
  };

  function handleSubmit(e: { preventDefault: () => void }) {
    setDbLoading(true);
    e.preventDefault();
    const split = tempAddresses.split(",");
    if (split) {
      setAddresses(split);
    }

    postData().then(async () => {
      setDbLoading(false);
      console.log("OK ROOT HASH", myResponse.rootHash);
      setContractLoading(true);
      const tx = await contract?.createPoll(
        1,
        account.address,
        myResponse.rootHash,
        16
      );
      const response = await tx.wait();
      setHash(tx.hash);
      console.log("tx", tx.hash);
      if (!isError) {
        toast({
          title: "Poll created",
          description: "We've created your poll!",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Transaction failed",
          description: "Transaction to create poll failed",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
      setContractLoading(false);
      console.log(`Transaction response: `, response);
    });
  }

  //   const { data, isError, isLoading, refetch } = useContractRead({
  //     address: SEMAPHORE_CONTRACT,
  //     abi: testABI,
  //     functionName: 'getPollState',
  // });

  //  const isReadToWrite = !isLoading && !isError && write != null;

  return (
    <>
      <Header />
      <div className={styles.container}>
        <main className={styles.main}>
          <Heading as="h1" size="xl">
            Generate a Poll
          </Heading>
          <Card variant={"elevated"} style={{ width: "40%", marginTop: "1%" }}>
            <CardBody>
              <FormControl
                className={styles.generate}
                onSubmit={(e) => handleSubmit(e)}
              >
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  placeholder="Additional Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <Input
                  placeholder="Group Description"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                />
                <Input
                  placeholder="Public Addresses"
                  value={tempAddresses}
                  onChange={(e) => setTempAddresses(e.target.value)}
                />
                <Button
                  type="submit"
                  size="md"
                  onClick={handleSubmit}
                  colorScheme="blue"
                  isLoading={contractLoading || dbLoading}
                  loadingText={
                    dbLoading ? "Generating merkle root" : "Submitting poll"
                  }
                  style={{marginTop: "2%"}}
                >
                  Submit
                </Button>
              </FormControl>
            </CardBody>
          </Card>
        </main>
      </div>
    </>
  );
}
