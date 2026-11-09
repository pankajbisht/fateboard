import type React from 'react';
import CardBody from '../molecules/CardBody';
import CardFooter from '../molecules/CardFooter';
import CardHeader from '../molecules/CardHeader';

type CardProp = {
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
};

function Card({ title, children, footer }: CardProp) {
    return (
        <div
            className="
        my-8 w-full max-w-3xl
        rounded-xl border border-line
        bg-surface
        shadow-sm hover:shadow-md
        transition-shadow duration-200
      "
        >
            {title && (
                <div className="px-5 pt-5 pb-3 border-b border-line">
                    <CardHeader title={title} />
                </div>
            )}

            <div className="px-5 py-4">
                <CardBody>{children}</CardBody>
            </div>

            {footer && (
                <div className="px-5 py-3 border-t border-line bg-surface-muted rounded-b-xl">
                    <CardFooter>{footer}</CardFooter>
                </div>
            )}
        </div>
    );
}

export default Card;
