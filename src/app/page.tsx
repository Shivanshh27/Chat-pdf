import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";

import Link from "next/link";
import FileUpload from "@/components/FileUpload";
import { LogIn } from "lucide-react";
export default async function Home() {
  const { userId } = await auth();
  const isAuth = !!userId;

  return (
    <div className="fixed inset-0 bg-gradient-to-r from-rose-100 to-teal-100 flex items-center justify-center">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="flex items-center space-x-3">
          <h1 className="text-5xl font-semibold">Chat with any PDF</h1>
          <UserButton afterSignOutUrl="/" />
        </div>

        {isAuth && <Button>Go to Chats</Button>}

        <p className="max-w-xl text-lg text-slate-700">
          Join millions of students, researchers and professionals to instantly
          answer questions and understand research with AI.
        </p>

        <div className="w-full mt-4">
          {isAuth ? (
            <FileUpload />
          ) : (
            <Link href="/sign-in">
              <Button>
                Login to get Started!
                <LogIn className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
