import { useEffect, useState, type PropsWithChildren, type MouseEvent } from "react";
import { useAction } from "convex/react";
import type { CreemComponentApi } from "../client/index.js";
export const CustomerPortalLink = ({
  creemApi,
  children,
  className,
}: PropsWithChildren<{
  creemApi: Pick<CreemComponentApi, "generateCustomerPortalUrl">;
  className?: string;
}>) => {
  const generateCustomerPortalUrl = useAction(
    creemApi.generateCustomerPortalUrl,
  );
  const [portalUrl, setPortalUrl] = useState<string>();

  useEffect(() => {
    void generateCustomerPortalUrl({}).then((result) => {
      if (result) {
        setPortalUrl(result.url);
      }
    });
  }, [generateCustomerPortalUrl]);

  if (!portalUrl) {
    return null;
  }

  return (
    <a className={className} href={portalUrl} target="_blank">
      {children}
    </a>
  );
};

/** Renders a checkout link for Creem. */
export const CheckoutLink = ({
  creemApi,
  productId,
  children,
  className,
  units,
  metadata,
  lazy = false,
}: PropsWithChildren<{
  creemApi: Pick<CreemComponentApi, "generateCheckoutLink">;
  productId: string;
  units?: number;
  metadata?: Record<string, string>;
  className?: string;
  lazy?: boolean;
}>) => {
  const generateCheckoutLink = useAction(creemApi.generateCheckoutLink);
  const [checkoutLink, setCheckoutLink] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (lazy) return;
    void generateCheckoutLink({
      productId,
      units,
      metadata,
      successUrl: window.location.href,
    }).then(({ url }) => setCheckoutLink(url));
  }, [lazy, productId, units, metadata, generateCheckoutLink]);

  const handleClick = lazy
    ? async (e: MouseEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        try {
          const { url } = await generateCheckoutLink({
            productId,
            units,
            metadata,
            successUrl: window.location.href,
          });
          window.open(url, "_blank");
        } finally {
          setIsLoading(false);
        }
      }
    : undefined;

  return (
    <a
      className={className}
      href={checkoutLink ?? (lazy ? "#" : undefined)}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};
